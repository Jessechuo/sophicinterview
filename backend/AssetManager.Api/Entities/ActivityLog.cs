namespace AssetManager.Api.Entities;

public class ActivityLog
{
    public int Id { get; set; }
    public int AssetId { get; set; }
    public Asset Asset { get; set; } = null!;
    public ActivityAction Action { get; set; }
    public int PerformedByUserId { get; set; }
    public User PerformedByUser { get; set; } = null!;
    public int? TargetUserId { get; set; }
    public User? TargetUser { get; set; }
    public string? Details { get; set; }
    public DateTime Timestamp { get; set; }
}
