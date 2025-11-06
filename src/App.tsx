// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  type User,
  type Appointment,
  type MedicalRecord,
  AppointmentStatus,
  roles,
} from "./types";
import {
  seedIfEmpty,
  authLogin,
  authLogout,
  currentUser,
  listDoctors,
  listPatients,
  createAppointment,
  listAppointmentsForUser,
  cancelAppointment,
  completeAppointment,
  createRecord,
  listRecordsForPatient,
} from "./store";

function Header({
  user,
  onLogout,
}: {
  user: User | null;
  onLogout: () => void;
}) {
  return (
    <header className="app-header">
      <h1>Healthcare Management System</h1>
      <div className="spacer" />
      {user ? (
        <div className="user-chip">
          <span>{user.name}</span>
          <span className="role">{user.role}</span>
          <button className="btn outline" onClick={onLogout}>
            Logout
          </button>
        </div>
      ) : null}
    </header>
  );
}

function Login({ onLoggedIn }: { onLoggedIn: (u: User) => void }) {
  const [username, setUsername] = useState("alice");
  const [password, setPassword] = useState("patient123");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const u = authLogin(username.trim(), password);
    if (!u) {
      setError("Invalid credentials");
    } else {
      setError(null);
      onLoggedIn(u);
    }
  }

  return (
    <div className="card login-card">
      <h2>Sign in</h2>
      <form onSubmit={handleSubmit} className="col gap-8">
        <label className="col">
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            required
          />
        </label>
        <label className="col">
          <span>Password</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" type="submit">
          Sign in
        </button>
      </form>
    </div>
  );
}

function PatientDashboard({ user }: { user: User }) {
  const doctors = listDoctors();
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  const [appointments, setAppointments] = useState<Appointment[]>(
    listAppointmentsForUser(user)
  );
  const records = listRecordsForPatient(user.id);

  function submitAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!doctorId || !date || !time) return;
    createAppointment({
      patientId: user.id,
      doctorId,
      date,
      time,
      reason: note,
    });
    setAppointments(listAppointmentsForUser(user));
    setNote("");
  }

  function onCancel(apptId: string) {
    cancelAppointment(apptId);
    setAppointments(listAppointmentsForUser(user));
  }

  return (
    <div className="grid two">
      <div className="card">
        <h3>Book an appointment</h3>
        <form onSubmit={submitAppointment} className="grid two gap-12">
          <label className="col">
            <span>Doctor</span>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              {doctors.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="col">
            <span>Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="col">
            <span>Time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </label>
          <label className="col span-2">
            <span>Reason / Note (optional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Headache for 3 days"
            />
          </label>
          <div className="col span-2 right">
            <button className="btn primary" type="submit">
              Book appointment
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Your appointments</h3>
        <ul className="list">
          {appointments.map((a) => (
            <li key={a.id} className="row between">
              <div className="col">
                <b>
                  {a.date} {a.time}
                </b>
                <span className="muted small">
                  With Dr. {listDoctors().find((d) => d.id === a.doctorId)?.name}
                </span>
                <span className="small">{a.reason || "—"}</span>
                <span className={`status ${a.status.toLowerCase()}`}>
                  {a.status}
                </span>
              </div>
              <div className="row gap-8">
                {a.status === AppointmentStatus.Scheduled && (
                  <button
                    className="btn outline"
                    onClick={() => onCancel(a.id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </li>
          ))}
          {appointments.length === 0 && (
            <li className="muted">No appointments yet.</li>
          )}
        </ul>
      </div>

      <div className="card span-2">
        <h3>Your medical records</h3>
        <RecordsList records={records} />
      </div>
    </div>
  );
}

function RecordsList({ records }: { records: MedicalRecord[] }) {
  return (
    <ul className="list">
      {records.map((r) => (
        <li key={r.id} className="col">
          <b>
            {r.date} — {r.title}
          </b>
          <span className="muted small">
            By Dr. {r.doctorName} (for {r.patientName})
          </span>
          <p className="pre-wrap">{r.notes}</p>
          {r.prescription && (
            <p>
              <b>Prescription:</b> {r.prescription}
            </p>
          )}
        </li>
      ))}
      {records.length === 0 && <li className="muted">No records yet.</li>}
    </ul>
  );
}

function DoctorDashboard({ user }: { user: User }) {
  const [appointments, setAppointments] = useState<Appointment[]>(
    listAppointmentsForUser(user)
  );

  const [selectedApptId, setSelectedApptId] = useState<string>("");
  const selectedAppt = useMemo(
    () => appointments.find((a) => a.id === selectedApptId) || null,
    [appointments, selectedApptId]
  );

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [prescription, setPrescription] = useState("");

  function refresh() {
    setAppointments(listAppointmentsForUser(user));
  }

  function markCompleteAndCreateRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAppt) return;
    const rec = createRecord({
      appointment: selectedAppt,
      title,
      notes,
      prescription,
      doctor: user,
    });
    completeAppointment(selectedAppt.id);
    setTitle("");
    setNotes("");
    setPrescription("");
    setSelectedApptId("");
    refresh();
    alert(`Record created for ${rec.patientName}`);
  }

  return (
    <div className="grid two">
      <div className="card">
        <h3>Upcoming appointments</h3>
        <ul className="list">
          {appointments.map((a) => (
            <li
              key={a.id}
              className={`row between selectable ${
                a.id === selectedApptId ? "selected" : ""
              }`}
              onClick={() => setSelectedApptId(a.id)}
            >
              <div className="col">
                <b>
                  {a.date} {a.time}
                </b>
                <span className="muted small">
                  Patient: {listPatients().find((p) => p.id === a.patientId)?.name}
                </span>
                <span className="small">{a.reason || "—"}</span>
                <span className={`status ${a.status.toLowerCase()}`}>
                  {a.status}
                </span>
              </div>
              <div className="row gap-8">
                {a.status === AppointmentStatus.Scheduled && (
                  <button
                    className="btn outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelAppointment(a.id);
                      refresh();
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </li>
          ))}
          {appointments.length === 0 && (
            <li className="muted">No appointments assigned.</li>
          )}
        </ul>
      </div>

      <div className="card">
        <h3>Create medical record</h3>
        <form onSubmit={markCompleteAndCreateRecord} className="col gap-8">
          <label className="col">
            <span>Selected appointment</span>
            <input
              value={
                selectedAppt
                  ? `${selectedAppt.date} ${selectedAppt.time} — Patient ${
                      listPatients().find((p) => p.id === selectedAppt.patientId)
                        ?.name
                    }`
                  : "—"
              }
              readOnly
            />
          </label>
          <label className="col">
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Acute Migraine"
              required
            />
          </label>
          <label className="col">
            <span>Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Symptoms, exam, plan…"
              required
            />
          </label>
          <label className="col">
            <span>Prescription (optional)</span>
            <input
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="e.g., Ibuprofen 400mg PRN"
            />
          </label>
          <div className="right">
            <button
              className="btn primary"
              type="submit"
              disabled={!selectedAppt}
              title={!selectedAppt ? "Select an appointment above" : ""}
            >
              Save record & mark appointment complete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    seedIfEmpty();
  }, []);

  const [user, setUser] = useState<User | null>(currentUser());

  return (
    <div className="app-root">
      <Header user={user} onLogout={() => { authLogout(); setUser(null); }} />
      <main className="container">
        {!user && <Login onLoggedIn={setUser} />}

        {user && user.role === roles.Patient && <PatientDashboard user={user} />}

        {user && user.role === roles.Doctor && <DoctorDashboard user={user} />}
      </main>
    </div>
  );
}
