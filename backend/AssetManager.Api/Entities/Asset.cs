namespace AssetManager.Api.Entities;

public class Asset : IHasTimestamps
{
    public int Id { get; set; }
    public string AssetTag { get; set; } = "";
    public string Name { get; set; } = "";
    public AssetCategory Category { get; set; }
    public string? Brand { get; set; }
    public string? Model { get; set; }
    public string? SerialNumber { get; set; }
    public DateOnly? PurchaseDate { get; set; }
    public decimal? PurchaseCost { get; set; }
    public string? Location { get; set; }
    public AssetStatus Status { get; set; }
    public int? AssignedToUserId { get; set; }
    public User? AssignedToUser { get; set; }
    public DateTime? AssignedAt { get; set; }
    public string? Notes { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Mapped to PostgreSQL's xmin system column for optimistic concurrency.
    public uint Version { get; set; }
}
