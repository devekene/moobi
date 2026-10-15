import { IoIosHelp } from "react-icons/io";

const appInfo = [
  {
    label: "App",
    value: "Moobi",
  },
  {
    label: "Version",
    value: "v1.0.1",
  },
];

const developerInfo = [
  {
    label: "Name",
    value: "Epiphanus",
  },
  {
    label: "Codename",
    value: "Patron",
  },
];

const InfoScreen = ({ showHeading = true }: { showHeading?: boolean }) => {
  return (
    <div className="relative w-full" style={{ paddingInline: "1rem" }}>
      {showHeading && (
        <div className="flex w-full items-center justify-between text-white">
          <h1 className="py-4 text-3xl font-bold">About</h1>

          <IoIosHelp color="white" className="h-10 w-10" />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-1">
        <h3 className="text-lg font-bold text-gray-300">General</h3>
        <ul className="gap-3">
          {appInfo.map((info) => (
            <li key={info.label} className="flex w-full">
              <p className="w-[60%] text-base text-gray-400">{info.label}</p>
              <p className="w-[40%] font-serif text-base text-gray-200">
                {info.value}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <section
        className="mt-8 space-y-2 text-white"
        aria-labelledby="simulation-notice"
      >
        <h3 id="simulation-notice" className="text-lg font-bold text-gray-300">
          Virtual device behavior
        </h3>
        <p className="text-sm leading-relaxed text-gray-400">
          Battery level and charging are browser simulations. They do not read
          or change the battery, charging port, or hardware on your actual
          device.
        </p>
      </section>

      <div className="mt-4 flex flex-col gap-1">
        <h3 className="text-lg font-bold text-gray-300">Developer</h3>
        <ul className="gap-3">
          {developerInfo.map((info) => (
            <li key={info.label} className="flex w-full">
              <p className="w-[60%] text-base text-gray-400">{info.label}</p>
              <p className="w-[40%] font-serif text-base text-gray-200">
                {info.value}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default InfoScreen;
