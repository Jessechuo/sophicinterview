using AssetManager.Api.Dtos;
using AssetManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetManager.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(AuthService auth) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public Task<LoginResponse> Login(LoginRequest request, CancellationToken ct) => auth.LoginAsync(request, ct);

    [HttpGet("me")]
    public Task<CurrentUserDto> Me(CancellationToken ct) => auth.GetCurrentAsync(ct);
}
