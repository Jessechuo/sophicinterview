using System.Net;
using System.Net.Http.Json;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
using AssetManager.Tests.Infrastructure;
using ClosedXML.Excel;

namespace AssetManager.Tests;

public sealed class ActivityLogTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private async Task<(HttpClient Admin, AssetDto Asset)> AssetWithHistoryAsync()
    {
        var admin = await factory.LoginAsync(await factory.CreateUserAsync(Role.Admin, "Aiman Hakim"));
        var holder = await factory.CreateUserAsync(fullName: "Priya Nair");
        var asset = await admin.CreateAssetAsync();
        (await admin.PutAsJsonAsync($"/api/assets/{asset.Id}", asset.ToUpdate() with { Location = "Server Room" },
            TestData.Json)).EnsureSuccessStatusCode();
        (await admin.PostAsJsonAsync($"/api/assets/{asset.Id}/assign", new { userId = holder.Id })).EnsureSuccessStatusCode();
        return (admin, asset);
    }

    [Fact]
    public async Task Lists_asset_history_newest_first_with_people()
    {
        var (admin, asset) = await AssetWithHistoryAsync();

        var page = await (await admin.GetAsync($"/api/activity-logs?assetId={asset.Id}"))
            .ReadAsync<PagedResult<ActivityLogDto>>();

        Assert.Equal(new[] { ActivityAction.Assigned, ActivityAction.Updated, ActivityAction.Created },
            page.Items.Select(l => l.Action));
        Assert.All(page.Items, l => Assert.Equal("Aiman Hakim", l.PerformedBy.FullName));
        Assert.Equal("Priya Nair", page.Items[0].TargetUser?.FullName);
        Assert.Equal(asset.AssetTag, page.Items[0].Asset.AssetTag);
        Assert.Equal("Location: (empty) → Server Room", page.Items[1].Details);
    }

    [Fact]
    public async Task Filters_by_action_search_and_date_range()
    {
        var (admin, asset) = await AssetWithHistoryAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        async Task<int> Count(string query) =>
            (await (await admin.GetAsync($"/api/activity-logs?search={asset.AssetTag}&{query}"))
                .ReadAsync<PagedResult<ActivityLogDto>>()).TotalCount;

        Assert.Equal(3, await Count(""));
        Assert.Equal(1, await Count("action=Updated"));
        Assert.Equal(0, await Count($"from={today.AddDays(1):yyyy-MM-dd}"));
        Assert.Equal(3, await Count($"from={today:yyyy-MM-dd}&to={today:yyyy-MM-dd}"));
    }

    [Fact]
    public async Task Export_returns_the_filtered_log_as_xlsx()
    {
        var (admin, asset) = await AssetWithHistoryAsync();

        var response = await admin.GetAsync($"/api/activity-logs/export?search={asset.AssetTag}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var workbook = new XLWorkbook(new MemoryStream(await response.Content.ReadAsByteArrayAsync()));
        Assert.Equal(4, workbook.Worksheet(1).LastRowUsed()!.RowNumber());
    }

    [Fact]
    public async Task Normal_user_gets_403()
    {
        var user = await factory.ClientAsync(Role.User);

        Assert.Equal(HttpStatusCode.Forbidden, (await user.GetAsync("/api/activity-logs")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await user.GetAsync("/api/activity-logs/export")).StatusCode);
    }
}
