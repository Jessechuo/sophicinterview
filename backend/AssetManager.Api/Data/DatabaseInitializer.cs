using Microsoft.EntityFrameworkCore;

namespace AssetManager.Api.Data;

public static class DatabaseInitializer
{
    public static async Task InitializeDatabaseAsync(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        if (config.GetValue("Seed:DemoData", false))
            await scope.ServiceProvider.GetRequiredService<DbSeeder>().SeedAsync();
    }
}
