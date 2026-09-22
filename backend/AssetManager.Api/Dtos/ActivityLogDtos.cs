using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;

namespace AssetManager.Api.Dtos;

public sealed record ActivityLogDto(
    int Id, AssetRefDto Asset, ActivityAction Action, UserRefDto PerformedBy, UserRefDto? TargetUser,
    string? Details, DateTime Timestamp);

public sealed class ActivityLogQuery : PageQuery
{
    public int? AssetId { get; set; }
    public ActivityAction? Action { get; set; }
    public string? Search { get; set; }
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
}
