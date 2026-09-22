using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AssetManager.Api.Infrastructure.Auth;

public static class AuthSetup
{
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services)
    {
        services.AddOptions<JwtSettings>()
            .BindConfiguration(JwtSettings.Section)
            .Validate(s => s.Key.Length >= 32, "Jwt:Key must be at least 32 characters.")
            .ValidateOnStart();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        // Configured through options so the signing key is read after all configuration sources load.
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtSettings>>((options, jwt) =>
            {
                var settings = jwt.Value;
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = settings.Issuer,
                    ValidAudience = settings.Audience,
                    IssuerSigningKey = settings.SigningKey(),
                    NameClaimType = AppClaims.Name,
                    RoleClaimType = AppClaims.Role,
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
            });

        // Secure by default: every endpoint needs a signed-in user unless marked [AllowAnonymous].
        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddSingleton<JwtTokenService>();
        return services;
    }
}
