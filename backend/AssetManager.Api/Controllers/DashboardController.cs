using AssetManager.Api.Dtos;
using AssetManager.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AssetManager.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController(DashboardService dashboard) : ControllerBase
{
    [HttpGet("summary")]
    public Task<DashboardSummaryDto> Summary(CancellationToken ct) => dashboard.GetSummaryAsync(ct);
}
