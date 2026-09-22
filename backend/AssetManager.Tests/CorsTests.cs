using System.Net;
using AssetManager.Tests.Infrastructure;

namespace AssetManager.Tests;

public sealed class CorsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static HttpRequestMessage Preflight(string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/assets");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "GET");
        request.Headers.Add("Access-Control-Request-Headers", "authorization");
        return request;
    }

    [Fact]
    public async Task Preflight_from_a_configured_origin_is_allowed()
    {
        var response = await factory.CreateClient().SendAsync(Preflight(ApiFactory.AllowedOrigin));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(ApiFactory.AllowedOrigin, response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    [Fact]
    public async Task Preflight_from_an_unknown_origin_gets_no_cors_headers()
    {
        var response = await factory.CreateClient().SendAsync(Preflight("https://evil.example.com"));

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
