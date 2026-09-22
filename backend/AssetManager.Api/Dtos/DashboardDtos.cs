namespace AssetManager.Api.Dtos;

public sealed record CountByKey(string Key, int Count);

public sealed record DashboardSummaryDto(
    int Total, int Assigned, int Unassigned, int NeedsAttention, int AddedLast30Days,
    IReadOnlyList<CountByKey> ByStatus, IReadOnlyList<CountByKey> ByCategory);
