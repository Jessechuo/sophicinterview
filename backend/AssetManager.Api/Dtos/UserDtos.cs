using System.ComponentModel.DataAnnotations;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;

namespace AssetManager.Api.Dtos;

public sealed record UserDto(
    int Id, string Username, string FullName, string Email, string? Department, Role Role,
    int AssignedAssetCount, DateTime CreatedAt);

public sealed record UserCreateRequest
{
    [Required, StringLength(50, MinimumLength = 3)]
    [RegularExpression("^[A-Za-z0-9._-]+$", ErrorMessage = "Username may only contain letters, digits, '.', '_' and '-'.")]
    public string Username { get; init; } = "";

    [Required, StringLength(100)] public string FullName { get; init; } = "";
    [Required, EmailAddress, StringLength(150)] public string Email { get; init; } = "";
    [StringLength(100)] public string? Department { get; init; }
    [Required] public Role? Role { get; init; }
    [Required, StringLength(100, MinimumLength = 8)] public string Password { get; init; } = "";
}

public sealed record UserUpdateRequest
{
    [Required, StringLength(100)] public string FullName { get; init; } = "";
    [Required, EmailAddress, StringLength(150)] public string Email { get; init; } = "";
    [StringLength(100)] public string? Department { get; init; }
    [Required] public Role? Role { get; init; }

    // Optional: leave empty to keep the current password.
    [StringLength(100, MinimumLength = 8)] public string? Password { get; init; }
}

public sealed class UserQuery : PageQuery
{
    public string? Search { get; set; }
    public Role? Role { get; set; }
    public bool? HasAssets { get; set; }
}
