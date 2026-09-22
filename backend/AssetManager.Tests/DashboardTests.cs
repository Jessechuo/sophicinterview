using System.Net.Http.Json;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Tests.Infrastructure;

namespace AssetManager.Tests;

// Single test: the class database holds only the rows created here, so counts are exact.
public sealed class DashboardTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Summary_counts_non_deleted_assets_for_any_user()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var holder = await factory.CreateUserAsync();
        var assigned = await admin.CreateAssetAsync();
        await admin.CreateAssetAsync();
        await admin.CreateAssetAsync(TestData.NewAsset() with { Status = AssetStatus.NeedsRepair, Category = AssetCategory.Monitor });
        await admin.CreateAssetAsync(TestData.NewAsset() with { Status = AssetStatus.UnderMaintenance, Category = AssetCategory.Phone });
        var deleted = await admin.CreateAssetAsync();
        (await admin.DeleteAsync($"/api/assets/{deleted.Id}")).EnsureSuccessStatusCode();
        (await admin.PostAsJsonAsync($"/api/assets/{assigned.Id}/assign", new { userId = holder.Id })).EnsureSuccessStatusCode();
        var user = await factory.ClientAsync(Role.User);

        var summary = await (await user.GetAsync("/api/dashboard/summary")).ReadAsync<DashboardSummaryDto>();

        Assert.Equal(4, summary.Total);
        Assert.Equal(1, summary.Assigned);
        Assert.Equal(3, summary.Unassigned);
        Assert.Equal(2, summary.NeedsAttention);
        Assert.Equal(4, summary.AddedLast30Days);
        Assert.Equal(Enum.GetNames<AssetStatus>(), summary.ByStatus.Select(s => s.Key));
        Assert.Equal(2, summary.ByStatus.Single(s => s.Key == "InService").Count);
        Assert.Equal(0, summary.ByStatus.Single(s => s.Key == "Retired").Count);
        Assert.Equal(Enum.GetNames<AssetCategory>(), summary.ByCategory.Select(c => c.Key));
        Assert.Equal(2, summary.ByCategory.Single(c => c.Key == "Laptop").Count);
    }
}
