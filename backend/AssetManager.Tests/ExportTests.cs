using System.Net;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure.Excel;
using AssetManager.Tests.Infrastructure;
using ClosedXML.Excel;

namespace AssetManager.Tests;

public sealed class ExportTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Asset_export_returns_xlsx_with_the_filtered_rows()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var m = Guid.NewGuid().ToString("N")[..10];
        await admin.CreateAssetAsync(TestData.NewAsset() with
        {
            Name = $"{m} one", PurchaseCost = 1234.5m, PurchaseDate = new DateOnly(2025, 1, 15)
        });
        await admin.CreateAssetAsync(TestData.NewAsset() with { Name = $"{m} two" });
        await admin.CreateAssetAsync(TestData.NewAsset());

        var response = await admin.GetAsync($"/api/assets/export?search={m}&sortBy=name");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ExcelExporter.ContentType, response.Content.Headers.ContentType?.MediaType);
        Assert.StartsWith("assets_", response.Content.Headers.ContentDisposition!.FileNameStar);
        using var workbook = new XLWorkbook(new MemoryStream(await response.Content.ReadAsByteArrayAsync()));
        var sheet = workbook.Worksheet(1);
        Assert.Equal("Asset Tag", sheet.Cell(1, 1).GetString());
        Assert.Equal(3, sheet.LastRowUsed()!.RowNumber());
        Assert.Equal($"{m} one", sheet.Cell(2, 2).GetString());
        Assert.Equal("In Service", sheet.Cell(2, 7).GetString());
        Assert.Equal(1234.5, sheet.Cell(2, 11).GetDouble());
    }

    [Fact]
    public async Task Normal_user_can_export_assets()
    {
        var user = await factory.ClientAsync(Role.User);

        var response = await user.GetAsync("/api/assets/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
