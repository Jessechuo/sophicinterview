using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
using AssetManager.Api.Infrastructure.Excel;
using AssetManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetManager.Api.Controllers;

[ApiController]
[Route("api/assets")]
public sealed class AssetsController(AssetService assets) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<AssetDto>> List([FromQuery] AssetQuery query, CancellationToken ct) =>
        assets.ListAsync(query, ct);

    [HttpGet("{id:int}")]
    public Task<AssetDto> Get(int id, CancellationToken ct) => assets.GetAsync(id, ct);

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] AssetQuery query, CancellationToken ct)
    {
        var rows = await assets.ListForExportAsync(query, ct);
        return File(Exports.Assets(rows), ExcelExporter.ContentType, $"assets_{DateTime.Now:yyyyMMdd_HHmm}.xlsx");
    }

    [HttpPost]
    [Authorize(Roles = nameof(Role.Admin))]
    public async Task<ActionResult<AssetDto>> Create(AssetCreateRequest request, CancellationToken ct)
    {
        var asset = await assets.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = asset.Id }, asset);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = nameof(Role.Admin))]
    public Task<AssetDto> Update(int id, AssetUpdateRequest request, CancellationToken ct) =>
        assets.UpdateAsync(id, request, ct);

    [HttpDelete("{id:int}")]
    [Authorize(Roles = nameof(Role.Admin))]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await assets.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/assign")]
    [Authorize(Roles = nameof(Role.Admin))]
    public Task<AssetDto> Assign(int id, AssignAssetRequest request, CancellationToken ct) =>
        assets.AssignAsync(id, request, ct);

    [HttpPost("{id:int}/unassign")]
    [Authorize(Roles = nameof(Role.Admin))]
    public Task<AssetDto> Unassign(int id, UnassignAssetRequest request, CancellationToken ct) =>
        assets.UnassignAsync(id, request, ct);
}
