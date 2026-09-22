using System.ComponentModel.DataAnnotations;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;

namespace AssetManager.Api.Dtos;

public sealed record TicketDto(
    int Id, string Title, string Description, TicketPriority Priority, TicketStatus Status,
    UserRefDto CreatedBy, AssetRefDto? RelatedAsset, string? ResolutionNote,
    DateTime CreatedAt, DateTime UpdatedAt, DateTime? ResolvedAt);

public sealed record TicketCreateRequest
{
    [Required, StringLength(150)] public string Title { get; init; } = "";
    [Required, StringLength(4000)] public string Description { get; init; } = "";
    [Required] public TicketPriority? Priority { get; init; }
    public int? RelatedAssetId { get; init; }
}

public sealed record TicketStatusRequest
{
    [Required] public TicketStatus? Status { get; init; }
    [StringLength(2000)] public string? ResolutionNote { get; init; }
}

public sealed class TicketQuery : PageQuery
{
    public string? Search { get; set; }
    public TicketStatus? Status { get; set; }
    public TicketPriority? Priority { get; set; }
    public int? RelatedAssetId { get; set; }
}

public sealed record TicketStatsDto(int All, int Open, int InProgress, int Resolved, int Closed, double? AvgResolutionHours);
