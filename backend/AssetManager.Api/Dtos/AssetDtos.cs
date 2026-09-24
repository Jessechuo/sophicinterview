using System.ComponentModel.DataAnnotations;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;

namespace AssetManager.Api.Dtos;

public sealed record AssetDto(
    int Id, string AssetTag, string Name, AssetCategory Category, string? Brand, string? Model,
    string? SerialNumber, DateOnly? PurchaseDate, decimal? PurchaseCost, string? Location, AssetStatus Status,
    UserRefDto? AssignedTo, DateTime? AssignedAt, string? Notes, DateTime CreatedAt, DateTime UpdatedAt, uint Version);

public record AssetCreateRequest
{
    [Required, StringLength(20)] public string AssetTag { get; init; } = "";
    [Required, StringLength(100)] public string Name { get; init; } = "";
    [Required] public AssetCategory? Category { get; init; }
    [StringLength(50)] public string? Brand { get; init; }
    [StringLength(50)] public string? Model { get; init; }
    [StringLength(100)] public string? SerialNumber { get; init; }
    [NotInFuture] public DateOnly? PurchaseDate { get; init; }
    [Range(typeof(decimal), "0", "9999999999.99", ParseLimitsInInvariantCulture = true)]
    public decimal? PurchaseCost { get; init; }
    [StringLength(100)] public string? Location { get; init; }
    [Required] public AssetStatus? Status { get; init; }
    [StringLength(1000)] public string? Notes { get; init; }
}

public sealed record AssetUpdateRequest : AssetCreateRequest
{
    // The version the client last saw; a mismatch means someone else changed the asset.
    [Required] public uint? Version { get; init; }
}

public sealed record AssignAssetRequest
{
    [Required] public int? UserId { get; init; }
    [StringLength(500)] public string? Note { get; init; }
}

public sealed record UnassignAssetRequest
{
    [StringLength(500)] public string? Note { get; init; }
}

public sealed class AssetQuery : PageQuery
{
    public string? Search { get; set; }
    public AssetStatus? Status { get; set; }
    public AssetCategory? Category { get; set; }
    public bool? Assigned { get; set; }
    /// <summary>Repairs and maintenance together, matching the dashboard's "needs attention" figure.</summary>
    public bool? NeedsAttention { get; set; }
    public int? AssignedToUserId { get; set; }
    public string? SortBy { get; set; }
    public string? SortDir { get; set; }
}
