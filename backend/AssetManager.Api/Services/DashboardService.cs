using AssetManager.Api.Data;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace AssetManager.Api.Services;

public sealed class DashboardService(AppDbContext db)
{
    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct)
    {
        var assets = db.Assets.AsNoTracking().Where(a => !a.IsDeleted);
        var byStatus = await assets.GroupBy(a => a.Status)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, ct);
        var byCategory = await assets.GroupBy(a => a.Category)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, ct);
        var assigned = await assets.CountAsync(a => a.AssignedToUserId != null, ct);
        var monthAgo = DateTime.UtcNow.AddDays(-30);
        var added = await assets.CountAsync(a => a.CreatedAt >= monthAgo, ct);
        var total = byStatus.Values.Sum();

        return new DashboardSummaryDto(
            total,
            assigned,
            total - assigned,
            byStatus.GetValueOrDefault(AssetStatus.NeedsRepair) + byStatus.GetValueOrDefault(AssetStatus.UnderMaintenance),
            added,
            Enum.GetValues<AssetStatus>().Select(s => new CountByKey(s.ToString(), byStatus.GetValueOrDefault(s))).ToList(),
            Enum.GetValues<AssetCategory>().Select(c => new CountByKey(c.ToString(), byCategory.GetValueOrDefault(c))).ToList());
    }
}
