using System.Security.Claims;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure.Errors;

namespace AssetManager.Api.Infrastructure.Auth;

public interface ICurrentUser
{
    int Id { get; }
    bool IsAdmin { get; }
}

public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal Principal =>
        accessor.HttpContext?.User ?? throw new InvalidOperationException("No active HTTP request.");

    public int Id => int.TryParse(Principal.FindFirstValue(AppClaims.UserId), out var id)
        ? id
        : throw new UnauthorizedException("Not signed in.");

    public bool IsAdmin => Principal.IsInRole(nameof(Role.Admin));
}
