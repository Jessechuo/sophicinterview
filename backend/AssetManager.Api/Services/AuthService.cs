using AssetManager.Api.Data;
using AssetManager.Api.Dtos;
using AssetManager.Api.Infrastructure.Auth;
using AssetManager.Api.Infrastructure.Errors;
using Microsoft.EntityFrameworkCore;

namespace AssetManager.Api.Services;

public sealed class AuthService(AppDbContext db, JwtTokenService tokens, ICurrentUser currentUser)
{
    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var username = request.Username.Trim().ToLowerInvariant();
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username && !u.IsDeleted, ct);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid username or password.");

        var (token, expiresAt) = tokens.CreateToken(user);
        return new LoginResponse(token, expiresAt, CurrentUserDto.From(user));
    }

    public async Task<CurrentUserDto> GetCurrentAsync(CancellationToken ct)
    {
        var userId = currentUser.Id;
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, ct)
            ?? throw new UnauthorizedException("Your account is no longer active.");
        return CurrentUserDto.From(user);
    }
}
