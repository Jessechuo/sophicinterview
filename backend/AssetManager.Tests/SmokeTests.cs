using AssetManager.Api.Data;
using AssetManager.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AssetManager.Tests;

public sealed class SmokeTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Database_is_migrated_on_startup()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        Assert.Equal(0, await db.Users.CountAsync());
    }
}
