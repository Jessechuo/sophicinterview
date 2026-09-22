using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AssetManager.Tests;

public sealed class AuthTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Login_with_valid_credentials_returns_token_and_user()
    {
        var user = await factory.CreateUserAsync(Role.Admin);

        var response = await factory.CreateClient().PostAsJsonAsync("/api/auth/login",
            new { username = user.Username.ToUpperInvariant(), password = TestData.Password });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.ReadAsync<LoginResponse>();
        Assert.False(string.IsNullOrWhiteSpace(body.Token));
        Assert.Equal(user.Id, body.User.Id);
        Assert.Equal(Role.Admin, body.User.Role);
        Assert.True(body.ExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task Login_with_wrong_password_returns_401_problem()
    {
        var user = await factory.CreateUserAsync();

        var response = await factory.CreateClient().PostAsJsonAsync("/api/auth/login",
            new { username = user.Username, password = "wrong-password" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.ReadAsync<ProblemDetails>();
        Assert.Equal("Invalid username or password.", problem.Detail);
    }

    [Fact]
    public async Task Login_as_deleted_user_returns_401()
    {
        var user = await factory.CreateUserAsync();
        await factory.SoftDeleteUserAsync(user.Id);

        var response = await factory.CreateClient().PostAsJsonAsync("/api/auth/login",
            new { username = user.Username, password = TestData.Password });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_with_missing_fields_returns_400_with_field_errors()
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new { username = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.ReadAsync<ValidationProblemDetails>();
        Assert.Contains("username", problem.Errors.Keys);
        Assert.Contains("password", problem.Errors.Keys);
    }

    [Fact]
    public async Task Me_without_token_returns_401()
    {
        var response = await factory.CreateClient().GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_with_tampered_token_returns_401()
    {
        var client = await factory.ClientAsync(Role.User);
        var token = client.DefaultRequestHeaders.Authorization!.Parameter!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token[..^2] + "xx");

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_with_token_returns_current_user()
    {
        var user = await factory.CreateUserAsync(Role.User, "Jane Tester");
        var client = await factory.LoginAsync(user);

        var me = await (await client.GetAsync("/api/auth/me")).ReadAsync<CurrentUserDto>();

        Assert.Equal(user.Id, me.Id);
        Assert.Equal("Jane Tester", me.FullName);
        Assert.Equal(Role.User, me.Role);
    }
}
