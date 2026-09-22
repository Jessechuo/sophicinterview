using System.Text.RegularExpressions;

namespace AssetManager.Api.Infrastructure;

public static partial class StringExtensions
{
    public static string? NullIfBlank(this string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    // InService -> "In Service"
    public static string Humanize(this Enum value) => WordBoundary().Replace(value.ToString(), " ");

    [GeneratedRegex("(?<=[a-z])(?=[A-Z])")]
    private static partial Regex WordBoundary();
}
