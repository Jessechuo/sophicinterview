using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using AssetManager.Api.Data;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace AssetManager.Tests.Infrastructure;

public static class TestData
{
    public const string Password = "Passw0rd!";

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    public static async Task<User> CreateUserAsync(this ApiFactory factory, Role role = Role.User, string? fullName = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var username = $"u{Guid.NewGuid():N}"[..12];
        var user = new User
        {
            Username = username,
            FullName = fullName ?? $"Test {username}",
            Email = $"{username}@test.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password, workFactor: 4),
            Role = role
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public static async Task<HttpClient> LoginAsync(this ApiFactory factory, User user, string password = Password)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new { username = user.Username, password });
        response.EnsureSuccessStatusCode();
        var body = await response.ReadAsync<LoginResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.Token);
        return client;
    }

    public static async Task<HttpClient> ClientAsync(this ApiFactory factory, Role role) =>
        await factory.LoginAsync(await factory.CreateUserAsync(role));

    public static async Task SoftDeleteUserAsync(this ApiFactory factory, int userId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Users.FindAsync(userId))!.IsDeleted = true;
        await db.SaveChangesAsync();
    }

    public static async Task<T> ReadAsync<T>(this HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<T>(Json))!;
}
