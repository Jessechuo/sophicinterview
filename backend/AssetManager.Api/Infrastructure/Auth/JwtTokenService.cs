using System.Security.Claims;
using AssetManager.Api.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace AssetManager.Api.Infrastructure.Auth;

public sealed class JwtTokenService(IOptions<JwtSettings> options)
{
    public (string Token, DateTime ExpiresAt) CreateToken(User user)
    {
        var settings = options.Value;
        var expiresAt = DateTime.UtcNow.AddHours(settings.ExpiryHours);
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = settings.Issuer,
            Audience = settings.Audience,
            Expires = expiresAt,
            Subject = new ClaimsIdentity(
            [
                new Claim(AppClaims.UserId, user.Id.ToString()),
                new Claim(AppClaims.Name, user.Username),
                new Claim(AppClaims.Role, user.Role.ToString())
            ]),
            SigningCredentials = new SigningCredentials(settings.SigningKey(), SecurityAlgorithms.HmacSha256)
        };
        return (new JsonWebTokenHandler().CreateToken(descriptor), expiresAt);
    }
}
