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

    private static readonly ExcelColumn<ActivityLogDto>[] ActivityColumns =
    [
        new("Timestamp (UTC)", l => l.Timestamp),
        new("Asset Tag", l => l.Asset.AssetTag),
        new("Asset Name", l => l.Asset.Name),
        new("Action", l => l.Action.Humanize()),
        new("Performed By", l => l.PerformedBy.FullName),
        new("Target User", l => l.TargetUser?.FullName),
        new("Details", l => l.Details)
    ];

    public static byte[] ActivityLogs(IEnumerable<ActivityLogDto> rows) =>
        ExcelExporter.Export("Activity Log", ActivityColumns, rows);

    private static readonly ExcelColumn<UserDto>[] UserColumns =
    [
        new("Username", u => u.Username),
        new("Full Name", u => u.FullName),
        new("Email", u => u.Email),
        new("Department", u => u.Department),
        new("Role", u => u.Role.ToString()),
        new("Assigned Assets", u => u.AssignedAssetCount),
        new("Created At (UTC)", u => u.CreatedAt)
    ];

    public static byte[] Users(IEnumerable<UserDto> rows) => ExcelExporter.Export("Users", UserColumns, rows);
}
