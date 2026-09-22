using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace AssetManager.Api.Data;

// Demo data for reviewers: runs on startup when Seed:DemoData is true and the database has no users.
public sealed class DbSeeder(AppDbContext db)
{
    public const string AdminPassword = "Admin@123";
    public const string UserPassword = "User@123";

    private static readonly (string Name, AssetCategory Category, string Brand, string Model, decimal Cost)[] Catalog =
    [
        ("Dell Latitude 5440", AssetCategory.Laptop, "Dell", "Latitude 5440", 4899m),
        ("Lenovo ThinkPad T14", AssetCategory.Laptop, "Lenovo", "ThinkPad T14 Gen 4", 5299m),
        ("HP EliteBook 840", AssetCategory.Laptop, "HP", "EliteBook 840 G10", 5599m),
        ("MacBook Pro 14", AssetCategory.Laptop, "Apple", "MacBook Pro 14 M3", 8999m),
        ("Dell Latitude 7440", AssetCategory.Laptop, "Dell", "Latitude 7440", 6199m),
        ("Lenovo ThinkPad X1 Carbon", AssetCategory.Laptop, "Lenovo", "X1 Carbon Gen 11", 7499m),
        ("HP ProBook 450", AssetCategory.Laptop, "HP", "ProBook 450 G10", 3899m),
        ("Dell OptiPlex 7010", AssetCategory.Desktop, "Dell", "OptiPlex 7010", 3599m),
        ("HP Elite Tower 800", AssetCategory.Desktop, "HP", "Elite Tower 800 G9", 4299m),
        ("Lenovo ThinkCentre M70q", AssetCategory.Desktop, "Lenovo", "ThinkCentre M70q", 2999m),
        ("Dell UltraSharp 27", AssetCategory.Monitor, "Dell", "U2723QE", 2399m),
        ("LG 27UP850", AssetCategory.Monitor, "LG", "27UP850-W", 1899m),
        ("Samsung ViewFinity S6", AssetCategory.Monitor, "Samsung", "LS27A600", 1299m),
        ("Dell P2422H", AssetCategory.Monitor, "Dell", "P2422H", 899m),
        ("LG 24MP400", AssetCategory.Monitor, "LG", "24MP400-B", 499m),
        ("iPhone 15", AssetCategory.Phone, "Apple", "iPhone 15 128GB", 3999m),
        ("Samsung Galaxy S24", AssetCategory.Phone, "Samsung", "Galaxy S24", 3699m),
        ("Google Pixel 8", AssetCategory.Phone, "Google", "Pixel 8", 3199m),
        ("iPad Air", AssetCategory.Tablet, "Apple", "iPad Air M2", 2999m),
        ("Samsung Galaxy Tab S9", AssetCategory.Tablet, "Samsung", "Galaxy Tab S9", 3499m),
        ("HP LaserJet Pro M404", AssetCategory.Printer, "HP", "LaserJet Pro M404dn", 1599m),
        ("Brother HL-L2375DW", AssetCategory.Printer, "Brother", "HL-L2375DW", 899m),
        ("Epson EcoTank L6270", AssetCategory.Printer, "Epson", "EcoTank L6270", 1199m),
        ("Cisco Catalyst 1000 Switch", AssetCategory.Network, "Cisco", "C1000-24T", 3899m),
        ("Ubiquiti UniFi AP", AssetCategory.Network, "Ubiquiti", "U6-Pro", 899m),
        ("Fortinet FortiGate 40F", AssetCategory.Network, "Fortinet", "FG-40F", 2499m),
        ("Logitech MX Keys", AssetCategory.Peripheral, "Logitech", "MX Keys", 449m),
        ("Logitech MX Master 3S", AssetCategory.Peripheral, "Logitech", "MX Master 3S", 399m),
        ("Jabra Evolve2 65", AssetCategory.Peripheral, "Jabra", "Evolve2 65", 999m),
        ("APC Back-UPS 1500", AssetCategory.Other, "APC", "BX1500MI", 1299m)
    ];

    private static readonly string[] Locations = ["HQ - Level 2", "HQ - Level 3", "Penang Office", "Server Room", "Store Room"];

    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(ct)) return;

        var today = DateTime.UtcNow.Date;
        var userHash = BCrypt.Net.BCrypt.HashPassword(UserPassword);
        var admin = NewUser("admin", "Aiman Hakim", "IT Operations", Role.Admin,
            BCrypt.Net.BCrypt.HashPassword(AdminPassword), today.AddDays(-420));
        User[] staff =
        [
            NewUser("user", "Siti Aminah", "Finance Operations", Role.User, userHash, today.AddDays(-400)),
            NewUser("weijie", "Lim Wei Jie", "Engineering", Role.User, userHash, today.AddDays(-380)),
            NewUser("priya", "Priya Nair", "Human Resources", Role.User, userHash, today.AddDays(-350)),
            NewUser("farid", "Farid Ismail", "Marketing", Role.User, userHash, today.AddDays(-300)),
            NewUser("meiling", "Tan Mei Ling", "Customer Support", Role.User, userHash, today.AddDays(-200))
        ];
        db.Users.Add(admin);
        db.Users.AddRange(staff);

        var assets = new List<Asset>();
        for (var i = 0; i < Catalog.Length; i++)
        {
            var (name, category, brand, model, cost) = Catalog[i];
            var created = today.AddDays(-(29 + i * 12)).AddHours(9);
            var status = i switch
            {
                3 or 11 or 20 => AssetStatus.NeedsRepair,
                7 or 16 => AssetStatus.UnderMaintenance,
                27 or 29 => AssetStatus.Retired,
                _ => AssetStatus.InService
            };
            var asset = new Asset
            {
                AssetTag = $"AST-{i + 1:0000}",
                Name = name,
                Category = category,
                Brand = brand,
                Model = model,
                SerialNumber = $"{brand[..2].ToUpperInvariant()}{(i + 1) * 7919:000000}",
                PurchaseDate = DateOnly.FromDateTime(created.AddDays(-1)),
                PurchaseCost = cost,
                Location = Locations[i % Locations.Length],
                Status = status,
                CreatedAt = created
            };
            assets.Add(asset);
            Log(asset, ActivityAction.Created, admin, null, $"Created {asset.AssetTag} ({name})", created);

            // Two in three non-retired assets are handed out, rotating through the staff.
            if (status != AssetStatus.Retired && i % 3 != 2)
            {
                var holder = staff[i % staff.Length];
                asset.AssignedToUser = holder;
                asset.AssignedAt = created.AddDays(2);
                Log(asset, ActivityAction.Assigned, admin, holder, $"Assigned to {holder.FullName}", created.AddDays(2));
            }
            if (status != AssetStatus.InService)
                Log(asset, ActivityAction.Updated, admin, null,
                    $"Status: {AssetStatus.InService.Humanize()} → {status.Humanize()}", created.AddDays(10));
        }
        db.Assets.AddRange(assets);

        db.Tickets.AddRange(
            NewTicket(staff[0], "Laptop battery drains within two hours",
                "My laptop goes from full to empty in about two hours, even with only email and Excel open.",
                TicketPriority.High, TicketStatus.Open, assets[0], today.AddDays(-1).AddHours(8.5)),
            NewTicket(staff[1], "Phone screen cracked",
                "Dropped my work phone; the screen is cracked and touch stops working near the top.",
                TicketPriority.Medium, TicketStatus.InProgress, assets[16], today.AddDays(-4).AddHours(14)),
            NewTicket(staff[2], "Level 3 printer keeps jamming",
                "The HP LaserJet on Level 3 jams on almost every double-sided print job.",
                TicketPriority.Medium, TicketStatus.InProgress, assets[20], today.AddDays(-6).AddHours(10)),
            NewTicket(staff[0], "VPN disconnects every few minutes",
                "When working from home the VPN drops every 5–10 minutes and I have to sign in again.",
                TicketPriority.High, TicketStatus.Open, null, today.AddDays(-2).AddHours(9)),
            NewTicket(staff[4], "Laptop setup for new hire",
                "Please prepare a laptop for our new support agent starting next Monday.",
                TicketPriority.Low, TicketStatus.Closed, null, today.AddDays(-20).AddHours(11),
                "Laptop AST-0005 prepared and handed over.", today.AddDays(-18).AddHours(16)),
            NewTicket(staff[3], "Request for a second monitor",
                "A second screen would help with campaign reporting.",
                TicketPriority.Low, TicketStatus.Resolved, null, today.AddDays(-12).AddHours(15),
                "Assigned AST-0014 (Dell P2422H).", today.AddDays(-11).AddHours(10)));

        await db.SaveChangesAsync(ct);
    }

    private static User NewUser(string username, string fullName, string department, Role role, string hash, DateTime created) =>
        new()
        {
            Username = username,
            FullName = fullName,
            Email = $"{username}@company.local",
            Department = department,
            Role = role,
            PasswordHash = hash,
            CreatedAt = created
        };

    private void Log(Asset asset, ActivityAction action, User by, User? target, string details, DateTime at) =>
        db.ActivityLogs.Add(new ActivityLog
        {
            Asset = asset,
            Action = action,
            PerformedByUser = by,
            TargetUser = target,
            Details = details,
            Timestamp = at
        });

    private static Ticket NewTicket(User by, string title, string description, TicketPriority priority,
        TicketStatus status, Asset? asset, DateTime created, string? resolution = null, DateTime? resolvedAt = null) =>
        new()
        {
            Title = title,
            Description = description,
            Priority = priority,
            Status = status,
            CreatedByUser = by,
            RelatedAsset = asset,
            ResolutionNote = resolution,
            ResolvedAt = resolvedAt,
            CreatedAt = created
        };
}
