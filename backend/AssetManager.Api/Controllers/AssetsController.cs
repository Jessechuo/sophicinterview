using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
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
}
