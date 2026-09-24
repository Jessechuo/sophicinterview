using Npgsql;

namespace AssetManager.Api.Infrastructure;

/// <summary>
/// Hosted PostgreSQL providers (Railway, Render, Neon, Heroku) hand out a URL such as
/// <c>postgresql://user:pass@host:5432/db</c>, which Npgsql does not accept. Anything that is not such
/// a URL is already a key/value connection string and is passed through untouched.
/// </summary>
public static class DatabaseUrl
{
    public static string? ToConnectionString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
            !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)) return value;

        var uri = new Uri(value);
        var credentials = uri.UserInfo.Split(':', 2);
        return new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Database = uri.AbsolutePath.Trim('/'),
            Username = Uri.UnescapeDataString(credentials[0]),
            Password = credentials.Length > 1 ? Uri.UnescapeDataString(credentials[1]) : null,
            // Managed databases terminate TLS with their own certificate authority, and private
            // networks (…​.railway.internal) accept plain connections, so prefer TLS without demanding
            // a chain this container can verify.
            SslMode = SslMode.Prefer,
            TrustServerCertificate = true,
        }.ConnectionString;
    }
}
