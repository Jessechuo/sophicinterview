using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace AssetManager.Api.Infrastructure.Auth;

public sealed class JwtSettings
{
    public const string Section = "Jwt";

    public string Issuer { get; set; } = "AssetManager";
    public string Audience { get; set; } = "AssetManager";
    public string Key { get; set; } = "";
    public int ExpiryHours { get; set; } = 8;

    public SymmetricSecurityKey SigningKey() => new(Encoding.UTF8.GetBytes(Key));
}
