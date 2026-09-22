using System.Net;
using System.Net.Http.Json;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AssetManager.Tests;

public sealed class AssetCrudTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Create_returns_201_with_location_and_normalized_fields()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var tag = $"t-{Guid.NewGuid():N}"[..12];

        var response = await admin.PostAsJsonAsync("/api/assets",
            TestData.NewAsset() with { AssetTag = $"  {tag} ", Brand = "   ", Location = " HQ - Level 2 " }, TestData.Json);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var asset = await response.ReadAsync<AssetDto>();
        Assert.Equal($"/api/assets/{asset.Id}", response.Headers.Location?.AbsolutePath);
        Assert.Equal(tag.ToUpperInvariant(), asset.AssetTag);
        Assert.Null(asset.Brand);
        Assert.Equal("HQ - Level 2", asset.Location);
        Assert.Null(asset.AssignedTo);
        Assert.NotEqual(0u, asset.Version);
    }

    [Fact]
    public async Task Get_missing_asset_returns_404_problem()
    {
        var client = await factory.ClientAsync(Role.User);

        var response = await client.GetAsync("/api/assets/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("Asset 999999 was not found.", (await response.ReadAsync<ProblemDetails>()).Detail);
    }

    [Fact]
    public async Task Create_with_invalid_input_returns_400_with_field_errors()
    {
        var admin = await factory.ClientAsync(Role.Admin);

        var response = await admin.PostAsJsonAsync("/api/assets", new
        {
            assetTag = "",
            name = new string('x', 101),
            purchaseCost = -1,
            purchaseDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)),
            status = "InService"
        }, TestData.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.ReadAsync<ValidationProblemDetails>();
        Assert.Contains("assetTag", problem.Errors.Keys);
        Assert.Contains("name", problem.Errors.Keys);
        Assert.Contains("category", problem.Errors.Keys);
        Assert.Contains("purchaseCost", problem.Errors.Keys);
        Assert.Contains("purchaseDate", problem.Errors.Keys);
    }

    [Fact]
    public async Task Create_with_duplicate_tag_returns_409()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var existing = await admin.CreateAssetAsync();

        var response = await admin.PostAsJsonAsync("/api/assets",
            TestData.NewAsset(existing.AssetTag.ToLowerInvariant()), TestData.Json);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal($"Asset tag '{existing.AssetTag}' is already in use.",
            (await response.ReadAsync<ProblemDetails>()).Detail);
    }

    [Fact]
    public async Task Update_changes_fields_and_logs_a_readable_diff()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var asset = await admin.CreateAssetAsync();

        var response = await admin.PutAsJsonAsync($"/api/assets/{asset.Id}",
            asset.ToUpdate() with { Name = "Renamed Laptop", Status = AssetStatus.NeedsRepair }, TestData.Json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.ReadAsync<AssetDto>();
        Assert.Equal("Renamed Laptop", updated.Name);
        Assert.Equal(AssetStatus.NeedsRepair, updated.Status);
        Assert.NotEqual(asset.Version, updated.Version);
        var logs = await factory.LogsAsync(asset.Id);
        Assert.Equal(new[] { ActivityAction.Created, ActivityAction.Updated }, logs.Select(l => l.Action));
        Assert.Equal("Name: Test Laptop → Renamed Laptop; Status: In Service → Needs Repair", logs[1].Details);
    }

    [Fact]
    public async Task Update_with_stale_version_returns_409()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var asset = await admin.CreateAssetAsync();
        (await admin.PutAsJsonAsync($"/api/assets/{asset.Id}", asset.ToUpdate() with { Name = "First edit" },
            TestData.Json)).EnsureSuccessStatusCode();

        var response = await admin.PutAsJsonAsync($"/api/assets/{asset.Id}",
            asset.ToUpdate() with { Name = "Second edit" }, TestData.Json);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Update_without_changes_writes_no_log()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var asset = await admin.CreateAssetAsync();

        var response = await admin.PutAsJsonAsync($"/api/assets/{asset.Id}", asset.ToUpdate(), TestData.Json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Single(await factory.LogsAsync(asset.Id));
    }

    [Fact]
    public async Task Delete_soft_deletes_logs_and_frees_the_tag()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var asset = await admin.CreateAssetAsync();

        var response = await admin.DeleteAsync($"/api/assets/{asset.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"/api/assets/{asset.Id}")).StatusCode);
        Assert.Equal(ActivityAction.Deleted, (await factory.LogsAsync(asset.Id))[^1].Action);
        await admin.CreateAssetAsync(TestData.NewAsset(asset.AssetTag));
    }

    [Fact]
    public async Task Normal_user_can_read_but_not_write_assets()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var asset = await admin.CreateAssetAsync();
        var user = await factory.ClientAsync(Role.User);

        Assert.Equal(HttpStatusCode.OK, (await user.GetAsync($"/api/assets/{asset.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await user.PostAsJsonAsync("/api/assets", TestData.NewAsset(), TestData.Json)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await user.PutAsJsonAsync($"/api/assets/{asset.Id}", asset.ToUpdate(), TestData.Json)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await user.DeleteAsync($"/api/assets/{asset.Id}")).StatusCode);
    }
}
