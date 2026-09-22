using System.Net;
using System.Net.Http.Json;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Tests.Infrastructure;

namespace AssetManager.Tests;

public sealed class AssetAssignmentTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static Task<HttpResponseMessage> Assign(HttpClient client, int assetId, int userId, string? note = null) =>
        client.PostAsJsonAsync($"/api/assets/{assetId}/assign", new { userId, note });

    private static Task<HttpResponseMessage> Unassign(HttpClient client, int assetId, string? note = null) =>
        client.PostAsJsonAsync($"/api/assets/{assetId}/unassign", new { note });

    [Fact]
    public async Task Assign_sets_assignee_timestamp_and_logs()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var holder = await factory.CreateUserAsync(fullName: "Siti Aminah");
        var asset = await admin.CreateAssetAsync();

        var response = await Assign(admin, asset.Id, holder.Id, "Loaner");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var assigned = await response.ReadAsync<AssetDto>();
        Assert.Equal(holder.Id, assigned.AssignedTo?.Id);
        Assert.Equal(holder.Email, assigned.AssignedTo?.Email);
        Assert.NotNull(assigned.AssignedAt);
        var log = (await factory.LogsAsync(asset.Id))[^1];
        Assert.Equal(ActivityAction.Assigned, log.Action);
        Assert.Equal(holder.Id, log.TargetUserId);
        Assert.Equal("Assigned to Siti Aminah. Note: Loaner", log.Details);
    }

    [Fact]
    public async Task Reassign_logs_unassigned_then_assigned()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var first = await factory.CreateUserAsync();
        var second = await factory.CreateUserAsync();
        var asset = await admin.CreateAssetAsync();
        (await Assign(admin, asset.Id, first.Id)).EnsureSuccessStatusCode();

        var response = await Assign(admin, asset.Id, second.Id);

        Assert.Equal(second.Id, (await response.ReadAsync<AssetDto>()).AssignedTo?.Id);
        var logs = await factory.LogsAsync(asset.Id);
        Assert.Equal(
            new[] { ActivityAction.Created, ActivityAction.Assigned, ActivityAction.Unassigned, ActivityAction.Assigned },
            logs.Select(l => l.Action));
        Assert.Equal(first.Id, logs[2].TargetUserId);
        Assert.Equal(second.Id, logs[3].TargetUserId);
    }

    [Fact]
    public async Task Assigning_to_the_current_holder_returns_409()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var holder = await factory.CreateUserAsync();
        var asset = await admin.CreateAssetAsync();
        (await Assign(admin, asset.Id, holder.Id)).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Conflict, (await Assign(admin, asset.Id, holder.Id)).StatusCode);
    }

    [Fact]
    public async Task Unassign_clears_assignee_and_logs_the_note()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var holder = await factory.CreateUserAsync(fullName: "Lim Wei Jie");
        var asset = await admin.CreateAssetAsync();
        (await Assign(admin, asset.Id, holder.Id)).EnsureSuccessStatusCode();

        var response = await Unassign(admin, asset.Id, "Returned to IT inventory");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var unassigned = await response.ReadAsync<AssetDto>();
        Assert.Null(unassigned.AssignedTo);
        Assert.Null(unassigned.AssignedAt);
        var log = (await factory.LogsAsync(asset.Id))[^1];
        Assert.Equal(ActivityAction.Unassigned, log.Action);
        Assert.Equal(holder.Id, log.TargetUserId);
        Assert.Equal("Unassigned from Lim Wei Jie. Note: Returned to IT inventory", log.Details);
    }

    [Fact]
    public async Task Unassign_when_not_assigned_returns_409()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var asset = await admin.CreateAssetAsync();

        Assert.Equal(HttpStatusCode.Conflict, (await Unassign(admin, asset.Id)).StatusCode);
    }

    [Fact]
    public async Task Retired_asset_cannot_be_assigned()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var holder = await factory.CreateUserAsync();
        var asset = await admin.CreateAssetAsync(TestData.NewAsset() with { Status = AssetStatus.Retired });

        Assert.Equal(HttpStatusCode.Conflict, (await Assign(admin, asset.Id, holder.Id)).StatusCode);
    }

    [Fact]
    public async Task Assign_to_missing_or_deleted_user_returns_400()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var asset = await admin.CreateAssetAsync();
        var deleted = await factory.CreateUserAsync();
        await factory.SoftDeleteUserAsync(deleted.Id);

        Assert.Equal(HttpStatusCode.BadRequest, (await Assign(admin, asset.Id, 999999)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Assign(admin, asset.Id, deleted.Id)).StatusCode);
    }

    [Fact]
    public async Task Assigned_asset_cannot_be_retired_or_deleted()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var holder = await factory.CreateUserAsync();
        var asset = await admin.CreateAssetAsync();
        var assigned = await (await Assign(admin, asset.Id, holder.Id)).ReadAsync<AssetDto>();

        var retire = await admin.PutAsJsonAsync($"/api/assets/{asset.Id}",
            assigned.ToUpdate() with { Status = AssetStatus.Retired }, TestData.Json);
        var delete = await admin.DeleteAsync($"/api/assets/{asset.Id}");

        Assert.Equal(HttpStatusCode.Conflict, retire.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, delete.StatusCode);
    }

    [Fact]
    public async Task Filters_by_assignment_and_searches_assignee_name()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var m = Guid.NewGuid().ToString("N")[..10];
        var holder = await factory.CreateUserAsync(fullName: $"Holder {m}");
        var held = await admin.CreateAssetAsync(TestData.NewAsset() with { Name = "Plain laptop" });
        await admin.CreateAssetAsync(TestData.NewAsset() with { Name = $"{m} spare" });
        (await Assign(admin, held.Id, holder.Id)).EnsureSuccessStatusCode();

        Assert.Equal(2, (await admin.ListAssetsAsync($"search={m}")).TotalCount);
        Assert.Equal(held.Id, (await admin.ListAssetsAsync($"search={m}&assigned=true")).Items.Single().Id);
        Assert.Equal(1, (await admin.ListAssetsAsync($"search={m}&assigned=false")).TotalCount);
        Assert.Equal(held.Id, (await admin.ListAssetsAsync($"assignedToUserId={holder.Id}")).Items.Single().Id);
    }

    [Fact]
    public async Task Normal_user_cannot_assign_or_unassign()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var asset = await admin.CreateAssetAsync();
        var userAccount = await factory.CreateUserAsync();
        var user = await factory.LoginAsync(userAccount);

        Assert.Equal(HttpStatusCode.Forbidden, (await Assign(user, asset.Id, userAccount.Id)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Unassign(user, asset.Id)).StatusCode);
    }
}
