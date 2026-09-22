using System.Net;
using System.Net.Http.Json;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
using AssetManager.Tests.Infrastructure;

namespace AssetManager.Tests;

public sealed class TicketTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static async Task<TicketDto> SubmitAsync(HttpClient client, int? assetId = null, string title = "Laptop battery drains quickly")
    {
        var response = await client.PostAsJsonAsync("/api/tickets",
            new { title, description = "Battery lasts about two hours.", priority = "High", relatedAssetId = assetId });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.ReadAsync<TicketDto>();
    }

    private static async Task<PagedResult<TicketDto>> ListAsync(HttpClient client, string query = "") =>
        await (await client.GetAsync($"/api/tickets?pageSize=100&{query}")).ReadAsync<PagedResult<TicketDto>>();

    [Fact]
    public async Task User_submits_a_ticket_linked_to_an_asset()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var asset = await admin.CreateAssetAsync();
        var reporter = await factory.CreateUserAsync(fullName: "Siti Aminah");
        var user = await factory.LoginAsync(reporter);

        var ticket = await SubmitAsync(user, asset.Id);

        Assert.True(ticket.Id > 1000);
        Assert.Equal(TicketStatus.Open, ticket.Status);
        Assert.Equal(TicketPriority.High, ticket.Priority);
        Assert.Equal(reporter.Id, ticket.CreatedBy.Id);
        Assert.Equal(asset.AssetTag, ticket.RelatedAsset?.AssetTag);
        Assert.Equal(AssetCategory.Laptop, ticket.RelatedAsset?.Category);
        Assert.Null(ticket.ResolvedAt);
    }

    [Fact]
    public async Task Ticket_for_a_missing_asset_returns_400()
    {
        var user = await factory.ClientAsync(Role.User);

        var response = await user.PostAsJsonAsync("/api/tickets",
            new { title = "Broken", description = "It broke.", priority = "Low", relatedAssetId = 999999 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Users_see_only_their_own_tickets_and_admins_see_all()
    {
        var userA = await factory.LoginAsync(await factory.CreateUserAsync());
        var userB = await factory.LoginAsync(await factory.CreateUserAsync());
        var admin = await factory.ClientAsync(Role.Admin);
        var a = await SubmitAsync(userA);
        var b = await SubmitAsync(userB);

        var listA = await ListAsync(userA);
        var listAdmin = await ListAsync(admin);
        var statsA = await (await userA.GetAsync("/api/tickets/stats")).ReadAsync<TicketStatsDto>();

        Assert.Equal(new[] { a.Id }, listA.Items.Select(t => t.Id));
        Assert.Contains(listAdmin.Items, t => t.Id == a.Id);
        Assert.Contains(listAdmin.Items, t => t.Id == b.Id);
        Assert.Equal(1, statsA.All);
        Assert.Equal(1, statsA.Open);
    }

    [Fact]
    public async Task User_cannot_view_another_users_ticket()
    {
        var owner = await factory.LoginAsync(await factory.CreateUserAsync());
        var other = await factory.LoginAsync(await factory.CreateUserAsync());
        var ticket = await SubmitAsync(owner);

        Assert.Equal(HttpStatusCode.Forbidden, (await other.GetAsync($"/api/tickets/{ticket.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync($"/api/tickets/{ticket.Id}")).StatusCode);
    }

    [Fact]
    public async Task Admin_resolves_and_reopens_a_ticket()
    {
        var user = await factory.ClientAsync(Role.User);
        var admin = await factory.ClientAsync(Role.Admin);
        var ticket = await SubmitAsync(user);

        var resolved = await (await admin.PutAsJsonAsync($"/api/tickets/{ticket.Id}/status",
            new { status = "Resolved", resolutionNote = "Replaced battery" })).ReadAsync<TicketDto>();
        var stats = await (await admin.GetAsync("/api/tickets/stats")).ReadAsync<TicketStatsDto>();
        var reopened = await (await admin.PutAsJsonAsync($"/api/tickets/{ticket.Id}/status",
            new { status = "InProgress", resolutionNote = "Battery still failing" })).ReadAsync<TicketDto>();

        Assert.Equal(TicketStatus.Resolved, resolved.Status);
        Assert.Equal("Replaced battery", resolved.ResolutionNote);
        Assert.NotNull(resolved.ResolvedAt);
        Assert.NotNull(stats.AvgResolutionHours);
        Assert.Equal(TicketStatus.InProgress, reopened.Status);
        Assert.Null(reopened.ResolvedAt);
    }

    [Fact]
    public async Task User_cannot_change_ticket_status()
    {
        var user = await factory.ClientAsync(Role.User);
        var ticket = await SubmitAsync(user);

        var response = await user.PutAsJsonAsync($"/api/tickets/{ticket.Id}/status", new { status = "Closed" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Filters_by_related_asset_search_and_ticket_number()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var asset = await admin.CreateAssetAsync();
        var m = Guid.NewGuid().ToString("N")[..10];
        var linked = await SubmitAsync(admin, asset.Id, $"Screen flicker {m}");
        await SubmitAsync(admin);

        Assert.Equal(new[] { linked.Id }, (await ListAsync(admin, $"relatedAssetId={asset.Id}")).Items.Select(t => t.Id));
        Assert.Equal(new[] { linked.Id }, (await ListAsync(admin, $"search={m}")).Items.Select(t => t.Id));
        Assert.Equal(new[] { linked.Id }, (await ListAsync(admin, $"search={asset.AssetTag}")).Items.Select(t => t.Id));
        Assert.Equal(new[] { linked.Id },
            (await ListAsync(admin, $"search={Uri.EscapeDataString($"#{linked.Id}")}")).Items.Select(t => t.Id));
    }
}
