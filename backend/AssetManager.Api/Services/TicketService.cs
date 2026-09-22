using System.Linq.Expressions;
using AssetManager.Api.Data;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
using AssetManager.Api.Infrastructure.Auth;
using AssetManager.Api.Infrastructure.Errors;
using Microsoft.EntityFrameworkCore;

namespace AssetManager.Api.Services;

public sealed class TicketService(AppDbContext db, ICurrentUser currentUser)
{
    public Task<PagedResult<TicketDto>> ListAsync(TicketQuery q, CancellationToken ct)
    {
        var query = Visible();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var pattern = Like.Contains(q.Search);
            var number = int.TryParse(q.Search.Trim().TrimStart('#'), out var n) ? n : 0;
            query = query.Where(t =>
                t.Id == number ||
                EF.Functions.ILike(t.Title, pattern, Like.Escape) ||
                EF.Functions.ILike(t.RelatedAsset!.AssetTag, pattern, Like.Escape));
        }
        if (q.Status is { } status) query = query.Where(t => t.Status == status);
        if (q.Priority is { } priority) query = query.Where(t => t.Priority == priority);
        if (q.RelatedAssetId is { } assetId) query = query.Where(t => t.RelatedAssetId == assetId);

        return query.OrderByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id)
            .Select(ToDto).ToPagedResultAsync(q, ct);
    }

    public async Task<TicketStatsDto> GetStatsAsync(CancellationToken ct)
    {
        var visible = Visible();
        var counts = await visible.GroupBy(t => t.Status)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, ct);
        var durations = await visible.Where(t => t.ResolvedAt != null)
            .Select(t => new { t.CreatedAt, ResolvedAt = t.ResolvedAt!.Value })
            .ToListAsync(ct);
        double? avgHours = durations.Count == 0
            ? null
            : Math.Round(durations.Average(d => (d.ResolvedAt - d.CreatedAt).TotalHours), 1);

        return new TicketStatsDto(
            counts.Values.Sum(),
            counts.GetValueOrDefault(TicketStatus.Open),
            counts.GetValueOrDefault(TicketStatus.InProgress),
            counts.GetValueOrDefault(TicketStatus.Resolved),
            counts.GetValueOrDefault(TicketStatus.Closed),
            avgHours);
    }

    public async Task<TicketDto> GetAsync(int id, CancellationToken ct)
    {
        var ticket = await db.Tickets.AsNoTracking().Where(t => t.Id == id).Select(ToDto).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException($"Ticket #{id} was not found.");
        if (!currentUser.IsAdmin && ticket.CreatedBy.Id != currentUser.Id)
            throw new ForbiddenException("You can only view your own tickets.");
        return ticket;
    }

    public async Task<TicketDto> CreateAsync(TicketCreateRequest request, CancellationToken ct)
    {
        if (request.RelatedAssetId is { } assetId && !await db.Assets.AnyAsync(a => a.Id == assetId && !a.IsDeleted, ct))
            throw new BadRequestException("The selected asset does not exist.");

        var ticket = new Ticket
        {
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Priority = request.Priority!.Value,
            Status = TicketStatus.Open,
            CreatedByUserId = currentUser.Id,
            RelatedAssetId = request.RelatedAssetId
        };
        db.Tickets.Add(ticket);
        await db.SaveChangesAsync(ct);
        return await GetAsync(ticket.Id, ct);
    }

    public async Task<TicketDto> UpdateStatusAsync(int id, TicketStatusRequest request, CancellationToken ct)
    {
        var ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException($"Ticket #{id} was not found.");

        ticket.Status = request.Status!.Value;
        ticket.ResolutionNote = request.ResolutionNote.NullIfBlank();
        // Keep the first resolution time while resolved/closed; reopening clears it.
        ticket.ResolvedAt = ticket.Status is TicketStatus.Resolved or TicketStatus.Closed
            ? ticket.ResolvedAt ?? DateTime.UtcNow
            : null;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    private IQueryable<Ticket> Visible()
    {
        var query = db.Tickets.AsNoTracking();
        if (currentUser.IsAdmin) return query;
        var userId = currentUser.Id;
        return query.Where(t => t.CreatedByUserId == userId);
    }

    private static readonly Expression<Func<Ticket, TicketDto>> ToDto = t => new TicketDto(
        t.Id, t.Title, t.Description, t.Priority, t.Status,
        new UserRefDto(t.CreatedByUser.Id, t.CreatedByUser.Username, t.CreatedByUser.FullName,
            t.CreatedByUser.Email, t.CreatedByUser.Department),
        t.RelatedAsset == null
            ? null
            : new AssetRefDto(t.RelatedAsset.Id, t.RelatedAsset.AssetTag, t.RelatedAsset.Name, t.RelatedAsset.Category),
        t.ResolutionNote, t.CreatedAt, t.UpdatedAt, t.ResolvedAt);
}
