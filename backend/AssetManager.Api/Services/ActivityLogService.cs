using System.Linq.Expressions;
using AssetManager.Api.Data;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace AssetManager.Api.Services;

public sealed class ActivityLogService(AppDbContext db)
{
    public Task<PagedResult<ActivityLogDto>> ListAsync(ActivityLogQuery query, CancellationToken ct) =>
        Filter(query).Select(ToDto).ToPagedResultAsync(query, ct);

    public Task<List<ActivityLogDto>> ListForExportAsync(ActivityLogQuery query, CancellationToken ct) =>
        Filter(query).Select(ToDto).ToListAsync(ct);

    private IQueryable<ActivityLog> Filter(ActivityLogQuery q)
    {
        var query = db.ActivityLogs.AsNoTracking();
        if (q.AssetId is { } assetId) query = query.Where(l => l.AssetId == assetId);
        if (q.Action is { } action) query = query.Where(l => l.Action == action);
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var pattern = Like.Contains(q.Search);
            query = query.Where(l =>
                EF.Functions.ILike(l.Asset.AssetTag, pattern, Like.Escape) ||
                EF.Functions.ILike(l.Asset.Name, pattern, Like.Escape));
        }
        if (q.From is { } from)
        {
            var start = from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(l => l.Timestamp >= start);
        }
        if (q.To is { } to)
        {
            var end = to.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(l => l.Timestamp < end);
        }
        return query.OrderByDescending(l => l.Timestamp).ThenByDescending(l => l.Id);
    }

    private static readonly Expression<Func<ActivityLog, ActivityLogDto>> ToDto = l => new ActivityLogDto(
        l.Id,
        new AssetRefDto(l.Asset.Id, l.Asset.AssetTag, l.Asset.Name, l.Asset.Category),
        l.Action,
        new UserRefDto(l.PerformedByUser.Id, l.PerformedByUser.Username, l.PerformedByUser.FullName,
            l.PerformedByUser.Email, l.PerformedByUser.Department),
        l.TargetUser == null
            ? null
            : new UserRefDto(l.TargetUser.Id, l.TargetUser.Username, l.TargetUser.FullName,
                l.TargetUser.Email, l.TargetUser.Department),
        l.Details,
        l.Timestamp);
}
