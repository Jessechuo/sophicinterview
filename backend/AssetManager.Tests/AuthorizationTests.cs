using System.Net;
using System.Net.Http.Json;
using AssetManager.Api.Entities;
using AssetManager.Tests.Infrastructure;

namespace AssetManager.Tests;

// Guards the role matrix in spec §6: no token → 401, normal user on admin endpoints → 403.
public sealed class AuthorizationTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    public static TheoryData<string, string> AdminOnly => new()
    {
        { "POST", "/api/assets" },
        { "PUT", "/api/assets/1" },
        { "DELETE", "/api/assets/1" },
        { "POST", "/api/assets/1/assign" },
        { "POST", "/api/assets/1/unassign" },
        { "GET", "/api/activity-logs" },
        { "GET", "/api/activity-logs/export" },
        { "GET", "/api/users" },
        { "GET", "/api/users/1" },
        { "GET", "/api/users/export" },
        { "POST", "/api/users" },
        { "PUT", "/api/users/1" },
        { "DELETE", "/api/users/1" },
        { "PUT", "/api/tickets/1/status" }
    };

    public static TheoryData<string, string> AnySignedIn => new()
    {
        { "GET", "/api/auth/me" },
        { "GET", "/api/assets" },
        { "GET", "/api/assets/1" },
        { "GET", "/api/assets/export" },
        { "GET", "/api/dashboard/summary" },
        { "GET", "/api/tickets" },
        { "GET", "/api/tickets/stats" },
        { "POST", "/api/tickets" }
    };

    private static HttpRequestMessage Request(string method, string url) => new(new HttpMethod(method), url)
    {
        Content = method is "POST" or "PUT" ? JsonContent.Create(new { }) : null
    };

    [Theory]
    [MemberData(nameof(AdminOnly))]
    [MemberData(nameof(AnySignedIn))]
    public async Task Anonymous_requests_get_401(string method, string url)
    {
        var response = await factory.CreateClient().SendAsync(Request(method, url));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(AdminOnly))]
    public async Task Normal_users_get_403_on_admin_endpoints(string method, string url)
    {
        var user = await factory.ClientAsync(Role.User);

        var response = await user.SendAsync(Request(method, url));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(AnySignedIn))]
    public async Task Normal_users_are_not_blocked_on_shared_endpoints(string method, string url)
    {
        var user = await factory.ClientAsync(Role.User);

        var response = await user.SendAsync(Request(method, url));

        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
