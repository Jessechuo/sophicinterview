namespace AssetManager.Api.Entities;

public class Ticket : IHasTimestamps
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public TicketPriority Priority { get; set; }
    public TicketStatus Status { get; set; }
    public int CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public int? RelatedAssetId { get; set; }
    public Asset? RelatedAsset { get; set; }
    public string? ResolutionNote { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
