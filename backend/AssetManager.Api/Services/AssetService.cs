using System.Globalization;
using System.Linq.Expressions;
using AssetManager.Api.Data;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
using AssetManager.Api.Infrastructure.Auth;
using AssetManager.Api.Infrastructure.Errors;
using Microsoft.EntityFrameworkCore;

namespace AssetManager.Api.Services;

public sealed class AssetService(AppDbContext db, ICurrentUser currentUser)
{
    public Task<PagedResult<AssetDto>> ListAsync(AssetQuery query, CancellationToken ct) =>
        Sort(Filter(query), query).Select(ToDto).ToPagedResultAsync(query, ct);

    public async Task<AssetDto> GetAsync(int id, CancellationToken ct) =>
        await db.Assets.AsNoTracking().Where(a => a.Id == id && !a.IsDeleted).Select(ToDto).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException($"Asset {id} was not found.");

    public async Task<AssetDto> CreateAsync(AssetCreateRequest request, CancellationToken ct)
    {
        var asset = new Asset();
        Apply(asset, request);
        await EnsureUniqueAsync(asset, ct);
        db.Assets.Add(asset);
        Log(asset, ActivityAction.Created, details: $"Created {asset.AssetTag} ({asset.Name})");
        await db.SaveChangesAsync(ct);
        return await GetAsync(asset.Id, ct);
    }

    public async Task<AssetDto> UpdateAsync(int id, AssetUpdateRequest request, CancellationToken ct)
    {
        var asset = await FindAsync(id, ct);
        if (asset.Version != request.Version)
            throw new ConflictException("This asset was changed by someone else. Reload it and try again.");
        if (request.Status == AssetStatus.Retired && asset.AssignedToUserId is not null)
            throw new ConflictException("Unassign this asset before retiring it.");

        var before = Snapshot(asset);
        Apply(asset, request);
        var changes = Describe(before, Snapshot(asset));
        if (changes.Count == 0) return await GetAsync(id, ct);

        await EnsureUniqueAsync(asset, ct);
        Log(asset, ActivityAction.Updated, details: string.Join("; ", changes));
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct)
    {
        var asset = await FindAsync(id, ct);
        if (asset.AssignedToUserId is not null)
            throw new ConflictException("Unassign this asset before deleting it.");

        asset.IsDeleted = true;
        Log(asset, ActivityAction.Deleted, details: $"Deleted {asset.AssetTag} ({asset.Name})");
        await db.SaveChangesAsync(ct);
    }

    public async Task<AssetDto> AssignAsync(int id, AssignAssetRequest request, CancellationToken ct)
    {
        var asset = await FindAsync(id, ct);
        if (asset.Status == AssetStatus.Retired)
            throw new ConflictException("Retired assets cannot be assigned.");
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId && !u.IsDeleted, ct)
            ?? throw new BadRequestException("The selected user does not exist.");
        if (asset.AssignedToUserId == user.Id)
            throw new ConflictException($"{asset.AssetTag} is already assigned to {user.FullName}.");

        if (asset.AssignedToUser is { } previous)
            Log(asset, ActivityAction.Unassigned, previous.Id,
                $"Unassigned from {previous.FullName} (reassigned to {user.FullName})");

        asset.AssignedToUser = user;
        asset.AssignedAt = DateTime.UtcNow;
        Log(asset, ActivityAction.Assigned, user.Id, WithNote($"Assigned to {user.FullName}", request.Note));
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<AssetDto> UnassignAsync(int id, UnassignAssetRequest request, CancellationToken ct)
    {
        var asset = await FindAsync(id, ct);
        if (asset.AssignedToUser is not { } previous)
            throw new ConflictException($"{asset.AssetTag} is not assigned to anyone.");

        asset.AssignedToUser = null;
        asset.AssignedToUserId = null;
        asset.AssignedAt = null;
        Log(asset, ActivityAction.Unassigned, previous.Id, WithNote($"Unassigned from {previous.FullName}", request.Note));
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    private async Task<Asset> FindAsync(int id, CancellationToken ct) =>
        await db.Assets.Include(a => a.AssignedToUser).FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted, ct)
        ?? throw new NotFoundException($"Asset {id} was not found.");

    private IQueryable<Asset> Filter(AssetQuery q)
    {
        var query = db.Assets.AsNoTracking().Where(a => !a.IsDeleted);
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var pattern = Like.Contains(q.Search);
            query = query.Where(a =>
                EF.Functions.ILike(a.AssetTag, pattern, Like.Escape) ||
                EF.Functions.ILike(a.Name, pattern, Like.Escape) ||
                EF.Functions.ILike(a.Brand!, pattern, Like.Escape) ||
                EF.Functions.ILike(a.Model!, pattern, Like.Escape) ||
                EF.Functions.ILike(a.SerialNumber!, pattern, Like.Escape) ||
                EF.Functions.ILike(a.Location!, pattern, Like.Escape) ||
                EF.Functions.ILike(a.AssignedToUser!.FullName, pattern, Like.Escape));
        }
        if (q.Status is { } status) query = query.Where(a => a.Status == status);
        if (q.Category is { } category) query = query.Where(a => a.Category == category);
        if (q.Assigned is { } assigned) query = query.Where(a => (a.AssignedToUserId != null) == assigned);
        if (q.AssignedToUserId is { } holderId) query = query.Where(a => a.AssignedToUserId == holderId);
        return query;
    }

    private static IQueryable<Asset> Sort(IQueryable<Asset> query, AssetQuery q)
    {
        var desc = string.Equals(q.SortDir, "desc", StringComparison.OrdinalIgnoreCase);
        var ordered = q.SortBy?.ToLowerInvariant() switch
        {
            "name" => query.OrderByDirection(a => a.Name, desc),
            "category" => query.OrderByDirection(a => a.Category, desc),
            "status" => query.OrderByDirection(a => a.Status, desc),
            "purchasedate" => query.OrderByDirection(a => a.PurchaseDate, desc),
            "assignee" => query.OrderByDirection(a => a.AssignedToUser!.FullName, desc),
            _ => query.OrderByDirection(a => a.AssetTag, desc)
        };
        return ordered.ThenBy(a => a.Id);
    }

    private async Task EnsureUniqueAsync(Asset asset, CancellationToken ct)
    {
        if (await db.Assets.AnyAsync(a => a.Id != asset.Id && !a.IsDeleted && a.AssetTag == asset.AssetTag, ct))
            throw new ConflictException($"Asset tag '{asset.AssetTag}' is already in use.");
        if (asset.SerialNumber is not null &&
            await db.Assets.AnyAsync(a => a.Id != asset.Id && !a.IsDeleted && a.SerialNumber == asset.SerialNumber, ct))
            throw new ConflictException($"Serial number '{asset.SerialNumber}' is already in use.");
    }

    private void Log(Asset asset, ActivityAction action, int? targetUserId = null, string? details = null) =>
        db.ActivityLogs.Add(new ActivityLog
        {
            Asset = asset,
            Action = action,
            PerformedByUserId = currentUser.Id,
            TargetUserId = targetUserId,
            Details = details,
            Timestamp = DateTime.UtcNow
        });

    private static string WithNote(string text, string? note) =>
        note.NullIfBlank() is { } n ? $"{text}. Note: {n}" : text;

    private static void Apply(Asset asset, AssetCreateRequest r)
    {
        asset.AssetTag = r.AssetTag.Trim().ToUpperInvariant();
        asset.Name = r.Name.Trim();
        asset.Category = r.Category!.Value;
        asset.Brand = r.Brand.NullIfBlank();
        asset.Model = r.Model.NullIfBlank();
        asset.SerialNumber = r.SerialNumber.NullIfBlank();
        asset.PurchaseDate = r.PurchaseDate;
        asset.PurchaseCost = r.PurchaseCost;
        asset.Location = r.Location.NullIfBlank();
        asset.Status = r.Status!.Value;
        asset.Notes = r.Notes.NullIfBlank();
    }

    private static Dictionary<string, string?> Snapshot(Asset a) => new()
    {
        ["Asset tag"] = a.AssetTag,
        ["Name"] = a.Name,
        ["Category"] = a.Category.Humanize(),
        ["Brand"] = a.Brand,
        ["Model"] = a.Model,
        ["Serial number"] = a.SerialNumber,
        ["Purchase date"] = a.PurchaseDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        ["Purchase cost"] = a.PurchaseCost?.ToString("0.00", CultureInfo.InvariantCulture),
        ["Location"] = a.Location,
        ["Status"] = a.Status.Humanize(),
        ["Notes"] = a.Notes
    };

    // "Field: old → new" per changed field; notes are only flagged so the log stays short.
    private static List<string> Describe(Dictionary<string, string?> before, Dictionary<string, string?> after) =>
        before.Where(kv => kv.Value != after[kv.Key])
            .Select(kv => kv.Key == "Notes"
                ? "Notes changed"
                : $"{kv.Key}: {kv.Value ?? "(empty)"} → {after[kv.Key] ?? "(empty)"}")
            .ToList();

    private static readonly Expression<Func<Asset, AssetDto>> ToDto = a => new AssetDto(
        a.Id, a.AssetTag, a.Name, a.Category, a.Brand, a.Model, a.SerialNumber, a.PurchaseDate, a.PurchaseCost,
        a.Location, a.Status,
        a.AssignedToUser == null
            ? null
            : new UserRefDto(a.AssignedToUser.Id, a.AssignedToUser.Username, a.AssignedToUser.FullName,
                a.AssignedToUser.Email, a.AssignedToUser.Department),
        a.AssignedAt, a.Notes, a.CreatedAt, a.UpdatedAt, a.Version);
}
