using System.ComponentModel.DataAnnotations;
using AssetManager.Api.Entities;

namespace AssetManager.Api.Dtos;

public sealed record LoginRequest
{
    [Required] public string Username { get; init; } = "";
    [Required] public string Password { get; init; } = "";
}

public sealed record CurrentUserDto(int Id, string Username, string FullName, string Email, Role Role)
{
    public static CurrentUserDto From(User user) => new(user.Id, user.Username, user.FullName, user.Email, user.Role);
}

public sealed record LoginResponse(string Token, DateTime ExpiresAt, CurrentUserDto User);
