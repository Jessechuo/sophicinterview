using AssetManager.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace AssetManager.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<Ticket> Tickets => Set<Ticket>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        builder.Properties<Enum>().HaveConversion<string>().HaveMaxLength(30);
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.Property(u => u.Username).HasMaxLength(50);
            e.Property(u => u.FullName).HasMaxLength(100);
            e.Property(u => u.Email).HasMaxLength(150);
            e.Property(u => u.Department).HasMaxLength(100);
            e.HasIndex(u => u.Username).IsUnique().HasFilter("\"IsDeleted\" = false");
            e.HasIndex(u => u.Email).IsUnique().HasFilter("\"IsDeleted\" = false");
        });

        b.Entity<Asset>(e =>
        {
            e.Property(a => a.AssetTag).HasMaxLength(20);
            e.Property(a => a.Name).HasMaxLength(100);
            e.Property(a => a.Brand).HasMaxLength(50);
            e.Property(a => a.Model).HasMaxLength(50);
            e.Property(a => a.SerialNumber).HasMaxLength(100);
            e.Property(a => a.Location).HasMaxLength(100);
            e.Property(a => a.Notes).HasMaxLength(1000);
            e.Property(a => a.PurchaseCost).HasPrecision(12, 2);
            e.Property(a => a.Version).IsRowVersion();
            e.HasIndex(a => a.AssetTag).IsUnique().HasFilter("\"IsDeleted\" = false");
            e.HasIndex(a => a.SerialNumber).IsUnique()
                .HasFilter("\"IsDeleted\" = false AND \"SerialNumber\" IS NOT NULL");
            e.HasOne(a => a.AssignedToUser).WithMany(u => u.AssignedAssets)
                .HasForeignKey(a => a.AssignedToUserId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<ActivityLog>(e =>
        {
            e.Property(l => l.Details).HasMaxLength(2000);
            e.HasIndex(l => l.Timestamp);
            e.HasOne(l => l.Asset).WithMany().HasForeignKey(l => l.AssetId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(l => l.PerformedByUser).WithMany().HasForeignKey(l => l.PerformedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(l => l.TargetUser).WithMany().HasForeignKey(l => l.TargetUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Ticket>(e =>
        {
            e.Property(t => t.Id).HasIdentityOptions(startValue: 1001);
            e.Property(t => t.Title).HasMaxLength(150);
            e.Property(t => t.Description).HasMaxLength(4000);
            e.Property(t => t.ResolutionNote).HasMaxLength(2000);
            e.HasOne(t => t.CreatedByUser).WithMany().HasForeignKey(t => t.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.RelatedAsset).WithMany().HasForeignKey(t => t.RelatedAssetId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<IHasTimestamps>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.CreatedAt == default) entry.Entity.CreatedAt = now;
                if (entry.Entity.UpdatedAt == default) entry.Entity.UpdatedAt = entry.Entity.CreatedAt;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, ct);
    }
}
