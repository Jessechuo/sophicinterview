using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
using AssetManager.Api.Infrastructure.Excel;
using AssetManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetManager.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = nameof(Role.Admin))]
public sealed class UsersController(UserService users) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<UserDto>> List([FromQuery] UserQuery query, CancellationToken ct) => users.ListAsync(query, ct);

    [HttpGet("{id:int}")]
    public Task<UserDto> Get(int id, CancellationToken ct) => users.GetAsync(id, ct);

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] UserQuery query, CancellationToken ct)
    {
        var rows = await users.ListForExportAsync(query, ct);
        return File(Exports.Users(rows), ExcelExporter.ContentType, $"users_{DateTime.Now:yyyyMMdd_HHmm}.xlsx");
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(UserCreateRequest request, CancellationToken ct)
    {
        var user = await users.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
    }

    [HttpPut("{id:int}")]
    public Task<UserDto> Update(int id, UserUpdateRequest request, CancellationToken ct) =>
        users.UpdateAsync(id, request, ct);

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await users.DeleteAsync(id, ct);
        return NoContent();
    }
}
