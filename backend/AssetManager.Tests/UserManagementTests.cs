using System.Net;
using System.Net.Http.Json;
using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
using AssetManager.Tests.Infrastructure;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Mvc;

namespace AssetManager.Tests;

public sealed class UserManagementTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string NewPassword = "Str0ngPass!";

    private static object NewUserBody(string username) => new
    {
        username,
        fullName = "New Person",
        email = $"{username}@company.local",
        department = "Finance",
        role = "User",
        password = NewPassword
    };

    private static string NewUsername() => $"n{Guid.NewGuid():N}"[..10];

    [Fact]
    public async Task Admin_creates_a_user_who_can_then_log_in()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var username = NewUsername();

        var response = await admin.PostAsJsonAsync("/api/users", NewUserBody(username.ToUpperInvariant()));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.ReadAsync<UserDto>();
        Assert.Equal(username, created.Username);
        Assert.Equal($"{username}@company.local", created.Email);
        Assert.Equal("Finance", created.Department);
        var login = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new { username, password = NewPassword });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task Duplicate_username_is_rejected_case_insensitively()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var username = NewUsername();
        (await admin.PostAsJsonAsync("/api/users", NewUserBody(username))).EnsureSuccessStatusCode();

        var response = await admin.PostAsJsonAsync("/api/users", NewUserBody(username.ToUpperInvariant()));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Invalid_user_input_returns_400_with_field_errors()
    {
        var admin = await factory.ClientAsync(Role.Admin);

        var response = await admin.PostAsJsonAsync("/api/users", new
        {
            username = "a b", fullName = "", email = "not-an-email", role = "User", password = "short"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.ReadAsync<ValidationProblemDetails>();
        foreach (var field in new[] { "username", "fullName", "email", "password" })
            Assert.Contains(field, problem.Errors.Keys);
    }

    [Fact]
    public async Task Update_changes_profile_role_and_password()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var target = await factory.CreateUserAsync();

        var response = await admin.PutAsJsonAsync($"/api/users/{target.Id}", new
        {
            fullName = "Promoted Person", email = target.Email, department = "IT Operations", role = "Admin",
            password = "N3wPassword!"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.ReadAsync<UserDto>();
        Assert.Equal(Role.Admin, updated.Role);
        Assert.Equal("IT Operations", updated.Department);
        var login = await factory.CreateClient().PostAsJsonAsync("/api/auth/login",
            new { username = target.Username, password = "N3wPassword!" });
        Assert.Equal(Role.Admin, (await login.ReadAsync<LoginResponse>()).User.Role);
    }

    [Fact]
    public async Task Admin_cannot_demote_or_delete_themselves()
    {
        var me = await factory.CreateUserAsync(Role.Admin);
        var admin = await factory.LoginAsync(me);

        var demote = await admin.PutAsJsonAsync($"/api/users/{me.Id}",
            new { fullName = me.FullName, email = me.Email, role = "User" });
        var delete = await admin.DeleteAsync($"/api/users/{me.Id}");

        Assert.Equal(HttpStatusCode.Conflict, demote.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, delete.StatusCode);
    }

    [Fact]
    public async Task User_holding_assets_cannot_be_deleted_until_unassigned()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var holder = await factory.CreateUserAsync();
        var asset = await admin.CreateAssetAsync();
        (await admin.PostAsJsonAsync($"/api/assets/{asset.Id}/assign", new { userId = holder.Id })).EnsureSuccessStatusCode();

        var blocked = await admin.DeleteAsync($"/api/users/{holder.Id}");
        (await admin.PostAsJsonAsync($"/api/assets/{asset.Id}/unassign", new { })).EnsureSuccessStatusCode();
        var deleted = await admin.DeleteAsync($"/api/users/{holder.Id}");

        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        Assert.Contains("still holds 1 asset", (await blocked.ReadAsync<ProblemDetails>()).Detail);
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"/api/users/{holder.Id}")).StatusCode);
        var login = await factory.CreateClient().PostAsJsonAsync("/api/auth/login",
            new { username = holder.Username, password = TestData.Password });
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task Lists_with_search_role_filter_and_asset_counts()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var m = Guid.NewGuid().ToString("N")[..10];
        await factory.CreateUserAsync(Role.Admin, $"Admin {m}");
        var holder = await factory.CreateUserAsync(Role.User, $"Staff {m}");
        var asset = await admin.CreateAssetAsync();
        (await admin.PostAsJsonAsync($"/api/assets/{asset.Id}/assign", new { userId = holder.Id })).EnsureSuccessStatusCode();

        var all = await (await admin.GetAsync($"/api/users?search={m}")).ReadAsync<PagedResult<UserDto>>();
        var admins = await (await admin.GetAsync($"/api/users?search={m}&role=Admin")).ReadAsync<PagedResult<UserDto>>();

        Assert.Equal(2, all.TotalCount);
        Assert.Equal(1, all.Items.Single(u => u.Id == holder.Id).AssignedAssetCount);
        Assert.Equal($"Admin {m}", admins.Items.Single().FullName);
    }

    [Fact]
    public async Task Filters_by_whether_users_hold_assets()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var m = Guid.NewGuid().ToString("N")[..10];
        var holder = await factory.CreateUserAsync(fullName: $"Holder {m}");
        var idle = await factory.CreateUserAsync(fullName: $"Idle {m}");
        var asset = await admin.CreateAssetAsync();
        (await admin.PostAsJsonAsync($"/api/assets/{asset.Id}/assign", new { userId = holder.Id })).EnsureSuccessStatusCode();

        var holders = await (await admin.GetAsync($"/api/users?search={m}&hasAssets=true")).ReadAsync<PagedResult<UserDto>>();
        var idlers = await (await admin.GetAsync($"/api/users?search={m}&hasAssets=false")).ReadAsync<PagedResult<UserDto>>();

        Assert.Equal(holder.Id, holders.Items.Single().Id);
        Assert.Equal(idle.Id, idlers.Items.Single().Id);
    }

    [Fact]
    public async Task Lists_departments_in_use_once_each_and_sorted()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var m = Guid.NewGuid().ToString("N")[..8];
        async Task AddAsync(string department)
        {
            var username = NewUsername();
            (await admin.PostAsJsonAsync("/api/users",
                new { username, fullName = $"Dept {m}", email = $"{username}@company.local", department, role = "User", password = NewPassword }))
                .EnsureSuccessStatusCode();
        }
        await AddAsync($"Zebra {m}");
        await AddAsync($"Alpha {m}");
        await AddAsync($"Alpha {m}");   // a shared department must still appear once

        var departments = await (await admin.GetAsync("/api/users/departments")).ReadAsync<List<string>>();

        Assert.Single(departments, d => d == $"Alpha {m}");
        Assert.Contains($"Zebra {m}", departments);
        Assert.Equal(departments.Distinct().Order().ToList(), departments);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await (await factory.ClientAsync(Role.User)).GetAsync("/api/users/departments")).StatusCode);
    }

    [Fact]
    public async Task Export_returns_users_as_xlsx()
    {
        var admin = await factory.ClientAsync(Role.Admin);
        var m = Guid.NewGuid().ToString("N")[..10];
        await factory.CreateUserAsync(fullName: $"Export {m} A");
        await factory.CreateUserAsync(fullName: $"Export {m} B");

        var response = await admin.GetAsync($"/api/users/export?search={m}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.StartsWith("users_", response.Content.Headers.ContentDisposition!.FileNameStar);
        using var workbook = new XLWorkbook(new MemoryStream(await response.Content.ReadAsByteArrayAsync()));
        Assert.Equal(3, workbook.Worksheet(1).LastRowUsed()!.RowNumber());
    }

    [Fact]
    public async Task Normal_user_gets_403()
    {
        var user = await factory.ClientAsync(Role.User);

        Assert.Equal(HttpStatusCode.Forbidden, (await user.GetAsync("/api/users")).StatusCode);
    }
}
