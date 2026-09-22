namespace AssetManager.Api.Entities;

public class User : IHasTimestamps
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Department { get; set; }
    public string PasswordHash { get; set; } = "";
    public Role Role { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<Asset> AssignedAssets { get; set; } = [];
}
