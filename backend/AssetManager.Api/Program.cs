using System.Text.Json.Serialization;
using AssetManager.Api.Data;
using AssetManager.Api.Infrastructure.Auth;
using AssetManager.Api.Infrastructure.Errors;
using AssetManager.Api.Services;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers(o => o.ModelMetadataDetailsProviders.Add(new SystemTextJsonValidationMetadataProvider()))
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
// Resolved lazily so test overrides of the connection string are honoured.
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
    options.UseNpgsql(sp.GetRequiredService<IConfiguration>().GetConnectionString("Default")
        ?? throw new InvalidOperationException("Connection string 'Default' is not configured.")));
builder.Services.AddJwtAuthentication();
// The SPA may be hosted on another origin (e.g. Vercel); allowed origins come from Cors:AllowedOrigins.
builder.Services.AddCors();
builder.Services.AddOptions<CorsOptions>().Configure<IConfiguration>((options, config) =>
{
    var origins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    options.AddDefaultPolicy(policy => policy.WithOrigins(origins)
        .AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("Content-Disposition"));
});

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<AssetService>();
builder.Services.AddScoped<ActivityLogService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<TicketService>();
builder.Services.AddScoped<DbSeeder>();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
    app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "Asset Manager API"));
}
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.Services.InitializeDatabaseAsync();
await app.RunAsync();

public partial class Program;
