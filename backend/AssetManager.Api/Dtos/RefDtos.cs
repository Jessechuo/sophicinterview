using AssetManager.Api.Entities;

namespace AssetManager.Api.Dtos;

public sealed record UserRefDto(int Id, string Username, string FullName, string Email, string? Department);

public sealed record AssetRefDto(int Id, string AssetTag, string Name, AssetCategory Category);
