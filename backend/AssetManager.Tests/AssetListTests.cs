using System.Net;
using AssetManager.Api.Entities;
using AssetManager.Tests.Infrastructure;

namespace AssetManager.Tests;

// Each test tags its rows with a unique marker and searches by it, so tests sharing the class database stay independent.
public sealed class AssetListTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static string Marker() => Guid.NewGuid().ToString("N")[..10];

    [Fact]
    public async Task Search_matches_tag_name_brand_model_serial_and_location_case_insensitively()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var m = Marker();
        await admin.CreateAssetAsync(TestData.NewAsset($"TAG-{m}"));
        await admin.CreateAssetAsync(TestData.NewAsset() with { Name = $"Laptop {m}" });
        await admin.CreateAssetAsync(TestData.NewAsset() with { Brand = m.ToUpperInvariant() });
        await admin.CreateAssetAsync(TestData.NewAsset() with { Model = m });
        await admin.CreateAssetAsync(TestData.NewAsset() with { SerialNumber = $"SN-{m}" });
        await admin.CreateAssetAsync(TestData.NewAsset() with { Location = $"Room {m}" });
        await admin.CreateAssetAsync(TestData.NewAsset());

        var result = await admin.ListAssetsAsync($"search={m}");

        Assert.Equal(6, result.TotalCount);
    }

    [Fact]
    public async Task Search_treats_wildcards_literally()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var m = Marker();
        await admin.CreateAssetAsync(TestData.NewAsset() with { Name = $"{m} 100% battery" });
        await admin.CreateAssetAsync(TestData.NewAsset() with { Name = $"{m} 1000 battery" });

        var result = await admin.ListAssetsAsync($"search={Uri.EscapeDataString($"{m} 100%")}");

        Assert.Equal(1, result.TotalCount);
    }

    [Fact]
    public async Task Filters_by_status_and_category()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var m = Marker();
        await admin.CreateAssetAsync(TestData.NewAsset() with { Name = $"{m} a" });
        await admin.CreateAssetAsync(TestData.NewAsset() with { Name = $"{m} b", Category = AssetCategory.Monitor });
        await admin.CreateAssetAsync(TestData.NewAsset() with { Name = $"{m} c", Status = AssetStatus.NeedsRepair });

        Assert.Equal(2, (await admin.ListAssetsAsync($"search={m}&status=InService")).TotalCount);
        Assert.Equal(2, (await admin.ListAssetsAsync($"search={m}&category=Laptop")).TotalCount);
        Assert.Equal(1, (await admin.ListAssetsAsync($"search={m}&status=InService&category=Monitor")).TotalCount);
    }

    [Fact]
    public async Task Paging_returns_the_requested_page_and_total()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var m = Marker();
        for (var i = 0; i < 5; i++)
            await admin.CreateAssetAsync(TestData.NewAsset() with { Name = $"{m} {i}" });

        var result = await admin.ListAssetsAsync($"search={m}&page=3&pageSize=2");

        Assert.Single(result.Items);
        Assert.Equal(5, result.TotalCount);
        Assert.Equal(3, result.Page);
        Assert.Equal(2, result.PageSize);
    }

    [Fact]
    public async Task Sorts_by_name_descending()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var m = Marker();
        foreach (var suffix in new[] { "A", "C", "B" })
            await admin.CreateAssetAsync(TestData.NewAsset() with { Name = $"{m} {suffix}" });

        var result = await admin.ListAssetsAsync($"search={m}&sortBy=name&sortDir=desc");

        Assert.Equal(new[] { $"{m} C", $"{m} B", $"{m} A" }, result.Items.Select(a => a.Name));
    }

    [Fact]
    public async Task Page_size_over_100_returns_400()
    {
        var client = await factory.ClientAsync(Role.User);

        var response = await client.GetAsync("/api/assets?pageSize=101");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Deleted_assets_are_excluded()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var m = Marker();
        await admin.CreateAssetAsync(TestData.NewAsset() with { Name = $"{m} keep" });
        var gone = await admin.CreateAssetAsync(TestData.NewAsset() with { Name = $"{m} gone" });
        (await admin.DeleteAsync($"/api/assets/{gone.Id}")).EnsureSuccessStatusCode();

        Assert.Equal(1, (await admin.ListAssetsAsync($"search={m}")).TotalCount);
    }
}
