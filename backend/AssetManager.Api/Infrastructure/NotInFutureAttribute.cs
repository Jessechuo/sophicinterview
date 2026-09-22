using System.ComponentModel.DataAnnotations;

namespace AssetManager.Api.Infrastructure;

[AttributeUsage(AttributeTargets.Property)]
public sealed class NotInFutureAttribute() : ValidationAttribute("Date cannot be in the future.")
{
    public override bool IsValid(object? value) =>
        value is not DateOnly date || date <= DateOnly.FromDateTime(DateTime.UtcNow);
}
