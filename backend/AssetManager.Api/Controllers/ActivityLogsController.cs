using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
using AssetManager.Api.Infrastructure.Excel;
using AssetManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetManager.Api.Controllers;

[ApiController]
[Route("api/activity-logs")]
[Authorize(Roles = nameof(Role.Admin))]
public sealed class ActivityLogsController(ActivityLogService logs) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<ActivityLogDto>> List([FromQuery] ActivityLogQuery query, CancellationToken ct) =>
        logs.ListAsync(query, ct);

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] ActivityLogQuery query, CancellationToken ct)
    {
        var rows = await logs.ListForExportAsync(query, ct);
        return File(Exports.ActivityLogs(rows), ExcelExporter.ContentType,
            $"activity_log_{DateTime.Now:yyyyMMdd_HHmm}.xlsx");
    }
}
