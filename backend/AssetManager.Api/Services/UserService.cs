using System.Linq.Expressions;
using AssetManager.Api.Data;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
using AssetManager.Api.Infrastructure.Auth;
using AssetManager.Api.Infrastructure.Errors;
using Microsoft.EntityFrameworkCore;

namespace AssetManager.Api.Services;

public sealed class UserService(AppDbContext db, ICurrentUser currentUser)
{
    public Task<PagedResult<UserDto>> ListAsync(UserQuery query, CancellationToken ct) =>
        Filter(query).Select(ToDto).ToPagedResultAsync(query, ct);

    public Task<List<UserDto>> ListForExportAsync(UserQuery query, CancellationToken ct) =>
        Filter(query).Select(ToDto).ToListAsync(ct);

    /// <summary>Departments already in use, so the user form can offer them instead of free text.</summary>
    public Task<List<string>> ListDepartmentsAsync(CancellationToken ct) =>
        db.Users.AsNoTracking()
            .Where(u => !u.IsDeleted && u.Department != null)
            .Select(u => u.Department!)
            .Distinct()
            .OrderBy(d => d)
            .ToListAsync(ct);

    public async Task<UserDto> GetAsync(int id, CancellationToken ct) =>
        await db.Users.AsNoTracking().Where(u => u.Id == id && !u.IsDeleted).Select(ToDto).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException($"User {id} was not found.");

    public async Task<UserDto> CreateAsync(UserCreateRequest request, CancellationToken ct)
    {
        var user = new User
        {
            Username = request.Username.Trim().ToLowerInvariant(),
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Department = request.Department.NullIfBlank(),
            Role = request.Role!.Value,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };
        if (await db.Users.AnyAsync(u => !u.IsDeleted && u.Username == user.Username, ct))
            throw new ConflictException($"Username '{user.Username}' is already taken.");
        await EnsureEmailFreeAsync(user.Email, 0, ct);

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return await GetAsync(user.Id, ct);
    }

    public async Task<UserDto> UpdateAsync(int id, UserUpdateRequest request, CancellationToken ct)
    {
        var user = await FindAsync(id, ct);
        if (id == currentUser.Id && request.Role != Role.Admin)
            throw new ConflictException("You cannot remove your own admin role.");
        var email = request.Email.Trim().ToLowerInvariant();
        await EnsureEmailFreeAsync(email, id, ct);

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.Department = request.Department.NullIfBlank();
        user.Role = request.Role!.Value;
        if (!string.IsNullOrEmpty(request.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct)
    {
        if (id == currentUser.Id)
            throw new ConflictException("You cannot delete your own account.");
        var user = await FindAsync(id, ct);
        var held = await db.Assets.CountAsync(a => a.AssignedToUserId == id && !a.IsDeleted, ct);
        if (held > 0)
            throw new ConflictException($"{user.FullName} still holds {held} asset(s). Unassign them first.");

        user.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    private async Task<User> FindAsync(int id, CancellationToken ct) =>
        await db.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, ct)
        ?? throw new NotFoundException($"User {id} was not found.");

    private async Task EnsureEmailFreeAsync(string email, int exceptUserId, CancellationToken ct)
    {
        if (await db.Users.AnyAsync(u => !u.IsDeleted && u.Id != exceptUserId && u.Email == email, ct))
            throw new ConflictException($"Email '{email}' is already used by another account.");
    }

    private IQueryable<User> Filter(UserQuery q)
    {
        var query = db.Users.AsNoTracking().Where(u => !u.IsDeleted);
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var pattern = Like.Contains(q.Search);
            query = query.Where(u =>
                EF.Functions.ILike(u.Username, pattern, Like.Escape) ||
                EF.Functions.ILike(u.FullName, pattern, Like.Escape) ||
                EF.Functions.ILike(u.Email, pattern, Like.Escape) ||
                EF.Functions.ILike(u.Department!, pattern, Like.Escape));
        }
        if (q.Role is { } role) query = query.Where(u => u.Role == role);
        if (q.HasAssets is { } has) query = query.Where(u => u.AssignedAssets.Any(a => !a.IsDeleted) == has);
        return query.OrderBy(u => u.FullName).ThenBy(u => u.Id);
    }

    private static readonly Expression<Func<User, UserDto>> ToDto = u => new UserDto(
        u.Id, u.Username, u.FullName, u.Email, u.Department, u.Role,
        u.AssignedAssets.Count(a => !a.IsDeleted), u.CreatedAt);
}
