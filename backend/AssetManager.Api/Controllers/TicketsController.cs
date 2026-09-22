using AssetManager.Api.Dtos;
using AssetManager.Api.Entities;
using AssetManager.Api.Infrastructure;
using AssetManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetManager.Api.Controllers;

[ApiController]
[Route("api/tickets")]
public sealed class TicketsController(TicketService tickets) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<TicketDto>> List([FromQuery] TicketQuery query, CancellationToken ct) =>
        tickets.ListAsync(query, ct);

    [HttpGet("stats")]
    public Task<TicketStatsDto> Stats(CancellationToken ct) => tickets.GetStatsAsync(ct);

    [HttpGet("{id:int}")]
    public Task<TicketDto> Get(int id, CancellationToken ct) => tickets.GetAsync(id, ct);

    [HttpPost]
    public async Task<ActionResult<TicketDto>> Create(TicketCreateRequest request, CancellationToken ct)
    {
        var ticket = await tickets.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = ticket.Id }, ticket);
    }

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = nameof(Role.Admin))]
    public Task<TicketDto> UpdateStatus(int id, TicketStatusRequest request, CancellationToken ct) =>
        tickets.UpdateStatusAsync(id, request, ct);
}
