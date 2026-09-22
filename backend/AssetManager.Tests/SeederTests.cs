using System.Net.Http.Json;
using AssetManager.Api.Data;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AssetManager.Tests;

public sealed class SeederTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private async Task SeedTwiceAsync()
    {
        for (var i = 0; i < 2; i++)
        {
            using var scope = factory.Services.CreateScope();
            await scope.ServiceProvider.GetRequiredService<DbSeeder>().SeedAsync();
        }
    }

    [Fact]
    public async Task Seeds_demo_data_once_with_consistent_history()
    {
        await SeedTwiceAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        Assert.Equal(6, await db.Users.CountAsync());
        Assert.Equal(30, await db.Assets.CountAsync());
        Assert.Equal(6, await db.Tickets.CountAsync());
        var assigned = await db.Assets.Where(a => a.AssignedToUserId != null).ToListAsync();
        Assert.NotEmpty(assigned);
        Assert.DoesNotContain(assigned, a => a.Status == AssetStatus.Retired);
        foreach (var asset in assigned)
        {
            Assert.NotNull(asset.AssignedAt);
            Assert.True(await db.ActivityLogs.AnyAsync(l =>
                l.AssetId == asset.Id && l.Action == ActivityAction.Assigned && l.TargetUserId == asset.AssignedToUserId));
        }
    }

    [Fact]
    public async Task Demo_accounts_can_log_in()
    {
        await SeedTwiceAsync();
        var client = factory.CreateClient();

        var admin = await client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = DbSeeder.AdminPassword });
        var user = await client.PostAsJsonAsync("/api/auth/login", new { username = "user", password = DbSeeder.UserPassword });

        Assert.Equal(Role.Admin, (await admin.ReadAsync<LoginResponse>()).User.Role);
        Assert.Equal(Role.User, (await user.ReadAsync<LoginResponse>()).User.Role);
    }
}
