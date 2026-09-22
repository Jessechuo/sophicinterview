using AssetManager.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace AssetManager.Tests.Infrastructure;

// Boots the real API against a throwaway database that is dropped when the test class finishes.
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string JwtKey = "integration-test-signing-key-0123456789abcdef";
    public const string AllowedOrigin = "https://app.example.com";
    private readonly string _connectionString;

    public ApiFactory()
    {
        var config = new ConfigurationBuilder()
            .AddUserSecrets(typeof(Program).Assembly, optional: true)
            .AddEnvironmentVariables()
            .Build();
        var server = config.GetConnectionString("Default")
            ?? "Host=localhost;Port=5432;Username=postgres;Password=postgres";
        _connectionString = new NpgsqlConnectionStringBuilder(server)
        {
            Database = $"assetmanager_test_{Guid.NewGuid():N}"
        }.ConnectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = _connectionString,
            ["Jwt:Key"] = JwtKey,
            ["Seed:DemoData"] = "false",
            ["Cors:AllowedOrigins:0"] = AllowedOrigin
        }));
    }

    public Task InitializeAsync() => Task.CompletedTask;

    async Task IAsyncLifetime.DisposeAsync()
    {
        using (var scope = Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureDeletedAsync();
        await base.DisposeAsync();
    }
}
