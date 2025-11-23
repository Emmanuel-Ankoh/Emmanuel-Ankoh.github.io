from whitenoise.storage import CompressedManifestStaticFilesStorage


class NonStrictManifestStaticFilesStorage(CompressedManifestStaticFilesStorage):
    """Manifest storage that doesn't raise when an entry is missing.

    Django's default ManifestStaticFilesStorage (and WhiteNoise's compressed
    variant) raise a ValueError when a file referenced in templates is not
    present in the manifest. That can cause the app to fail at runtime if
    collectstatic hasn't run yet. This subclass sets ``manifest_strict`` to
    False so the storage falls back to the unhashed original filename when a
    manifest entry is missing.
    """

    manifest_strict = False

    def hashed_name(self, filename, *args, **kwargs):
        """Return the hashed name for a file, but fall back to the original
        filename if the manifest doesn't contain an entry.

        Django's ManifestStaticFilesStorage.hashed_name raises ValueError when
        a filename is not present in the manifest. That can crash template
        rendering on first deploy if collectstatic hasn't generated the
        manifest yet. Here we swallow that ValueError and return the original
        filename so templates can still render using the unhashed path.
        """
        try:
            return super().hashed_name(filename, *args, **kwargs)
        except ValueError:
            # Manifest entry missing — fall back to the unhashed filename.
            return filename
