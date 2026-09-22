using AssetManager.Api.Dtos;
using AssetManager.Api.Infrastructure;
using AssetManager.Api.Infrastructure.Excel;

namespace AssetManager.Api.Services;

// Column layouts for every Excel download.
public static class Exports
{
    private static readonly ExcelColumn<AssetDto>[] AssetColumns =
    [
        new("Asset Tag", a => a.AssetTag),
        new("Name", a => a.Name),
        new("Category", a => a.Category.Humanize()),
        new("Brand", a => a.Brand),
        new("Model", a => a.Model),
        new("Serial Number", a => a.SerialNumber),
        new("Status", a => a.Status.Humanize()),
        new("Assigned To", a => a.AssignedTo?.FullName),
        new("Location", a => a.Location),
        new("Purchase Date", a => a.PurchaseDate),
        new("Purchase Cost (RM)", a => a.PurchaseCost),
        new("Created At (UTC)", a => a.CreatedAt)
    ];

    public static byte[] Assets(IEnumerable<AssetDto> rows) => ExcelExporter.Export("Assets", AssetColumns, rows);
}
